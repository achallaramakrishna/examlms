/**
 * Extracts multiple-choice questions from scanned exam-page images using a
 * vision-capable LLM, matches them against a separate scanned answer key,
 * and writes a review JSON file for a human to check before it's loaded
 * into the database (via ingest-questions.ts).
 *
 * This does NOT write to Postgres directly — OCR/vision extraction is
 * imperfect and there is no reliable way to auto-verify a correct answer
 * was matched to the right question, so every run produces a review file
 * with `needsReview` flags instead of silently trusting the extraction.
 *
 * Folders (relative to vectordb/):
 *   data/scans/questions/    — drop scanned question-paper page images here
 *   data/scans/answer-key/   — drop scanned answer-key page images here
 *   data/scans/solutions/    — optional: worked-solution/explanation pages, matched to
 *                              questions by number, same as the answer key
 *   data/extracted/          — review-<timestamp>.json is written here
 *
 * Multiple chapters: each run processes ONE chapter's worth of content, matched
 * as a single set (questions + answer key + solutions all keyed by question
 * number). Mixing two chapters' question pages into one run is dangerous —
 * their question numbers collide (both start at 1), so a chapter-2 question
 * could silently get chapter-1's answer. To keep chapters separate, put each
 * chapter's question pages in its own subfolder, e.g.
 * data/scans/questions/chapter_1/, data/scans/questions/chapter_2/, and pass
 * the subfolder name as the chapterDir argument below — the script will NOT
 * recurse into subfolders on its own. If an answer-key/solutions subfolder of
 * the same name exists it's used too, otherwise the flat top-level files are
 * used (handy when one shared answer-key covers multiple chapters' pages).
 *
 * Diagrams: if a question or option contains a figure/diagram/graph that
 * can't be represented as text, the *entire source page image* is copied
 * to backend/public/question-images/ and linked as questionImageUrl /
 * option.imageUrl. This is a whole-page fallback, not a tight crop — good
 * enough to review and ship, but crop it down yourself in an image editor
 * if you want a tighter view before publishing.
 *
 * Dedicated diagram rescans: if you've separately scanned just one question's
 * or option's figure (e.g. because it needed a cleaner/closer shot than the
 * full page), name the file so it ends with "..._question_<N>.png" (whole
 * question) or "..._question_<N>_option_<A|B|C|D>.png" (one option). These
 * are matched to the already-extracted question #N by filename, not run
 * through the page-extraction prompt, and their image overrides the
 * whole-page fallback for that question/option.
 *
 * Usage: ts-node scripts/extract-scanned-questions.ts <examId> [sourceLabel] [previousYear] [topicName] [chapterDir]
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { pgPool } from './shared';

dotenv.config();

const QUESTIONS_DIR = path.join(__dirname, '../data/scans/questions');
const ANSWER_KEY_DIR = path.join(__dirname, '../data/scans/answer-key');
const SOLUTIONS_DIR = path.join(__dirname, '../data/scans/solutions');
const OUTPUT_DIR = path.join(__dirname, '../data/extracted');
// __dirname is vectordb/scripts — backend/ is a sibling of vectordb/, two levels up, not one.
const BACKEND_PUBLIC_DIR = path.resolve(__dirname, process.env.BACKEND_PUBLIC_DIR ?? '../../backend/public/question-images');
const PUBLIC_ASSET_BASE_URL = process.env.PUBLIC_ASSET_BASE_URL ?? 'http://localhost:4000';

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const VISION_MODEL = 'gpt-4o';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ExtractedOption {
  label: string;
  text: string;
  hasOptionImage?: boolean;
}

interface ExtractedQuestion {
  questionNumber: number;
  questionText: string;
  hasQuestionImage?: boolean;
  options: ExtractedOption[];
  subjectGuess?: string;
  difficultyGuess?: 'easy' | 'medium' | 'hard';
  sourceTag?: string;
}

interface ReviewQuestion {
  questionNumber: number;
  examId: string;
  subjectId: string | null;
  topicId?: string;
  questionText: string;
  questionImageUrl?: string;
  options: { label: string; text: string; imageUrl?: string }[];
  correctOption: string | null;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  source: string;
  previousYear?: number;
  sourceImage: string;
  needsReview: boolean;
  reviewNotes: string[];
}

/** Lists image files directly inside dir. Deliberately NOT recursive — see chapterDir below. */
function listImageFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && IMAGE_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
    .map((e) => path.join(dir, e.name))
    .sort();
}

/**
 * Scopes a scan folder to one chapter: if <baseDir>/<chapterDir> exists, use it;
 * otherwise fall back to the flat files directly in baseDir. Prevents two
 * chapters' question pages from ever being read in the same run.
 */
function resolveScanDir(baseDir: string, chapterDir: string | undefined): string {
  if (chapterDir) {
    const scoped = path.join(baseDir, chapterDir);
    if (fs.existsSync(scoped) && fs.statSync(scoped).isDirectory()) return scoped;
  }
  return baseDir;
}

function imageToDataUrl(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase().replace('.', '');
  const mime = ext === 'jpg' ? 'jpeg' : ext;
  const base64 = fs.readFileSync(filePath).toString('base64');
  return `data:image/${mime};base64,${base64}`;
}

async function callVisionJson(prompt: string, imageDataUrl: string): Promise<any> {
  const response = await openai.chat.completions.create({
    model: VISION_MODEL,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ],
      },
    ],
  });

  const content = response.choices[0]?.message?.content ?? '{}';
  return JSON.parse(content);
}

async function extractAnswerKey(chapterDir: string | undefined): Promise<Map<number, string>> {
  const dir = resolveScanDir(ANSWER_KEY_DIR, chapterDir);
  const files = listImageFiles(dir);
  const answers = new Map<number, string>();

  if (files.length === 0) {
    console.warn(`No answer-key images found in ${dir} — questions will be marked needsReview.`);
    return answers;
  }

  const prompt = `This image is a page from a scanned answer key for a multiple-choice exam.
Return strict JSON only, in this exact shape:
{ "answers": [ { "questionNumber": 1, "correctOption": "A" } ] }
questionNumber must be the integer question number as printed. correctOption must be one of "A","B","C","D".
Include every answer visible on the page. If the image is not an answer key, return { "answers": [] }.`;

  for (const file of files) {
    console.log(`Reading answer key: ${path.basename(file)}`);
    try {
      const parsed = await callVisionJson(prompt, imageToDataUrl(file));
      for (const a of parsed.answers ?? []) {
        if (answers.has(a.questionNumber) && answers.get(a.questionNumber) !== a.correctOption) {
          console.warn(
            `Conflicting answer for Q${a.questionNumber}: had ${answers.get(a.questionNumber)}, ${path.basename(
              file
            )} says ${a.correctOption}. Keeping the earlier value — check manually.`
          );
          continue;
        }
        answers.set(a.questionNumber, a.correctOption);
      }
    } catch (err) {
      console.error(`Failed to read answer key ${path.basename(file)}:`, err);
    }
  }

  console.log(`Parsed ${answers.size} answer(s) from the answer key.`);
  return answers;
}

async function extractSolutions(chapterDir: string | undefined): Promise<Map<number, string>> {
  const dir = resolveScanDir(SOLUTIONS_DIR, chapterDir);
  const files = listImageFiles(dir);
  const solutions = new Map<number, string>();

  if (files.length === 0) {
    console.log(`No solution images found in ${dir} — questions will be imported without an explanation.`);
    return solutions;
  }

  const prompt = `This image is a page of worked solutions/explanations for a multiple-choice exam.
Return strict JSON only, in this exact shape:
{ "solutions": [ { "questionNumber": 1, "explanation": "..." } ] }
questionNumber must be the integer question number as printed. explanation should be the full worked solution/reasoning
text for that question, transcribed as plain text (describe any equations in words if they can't be typed exactly).
Include every solution visible on the page. If the image is not a solutions page, return { "solutions": [] }.`;

  for (const file of files) {
    console.log(`Reading solutions page: ${path.basename(file)}`);
    try {
      const parsed = await callVisionJson(prompt, imageToDataUrl(file));
      for (const s of parsed.solutions ?? []) {
        if (solutions.has(s.questionNumber)) {
          console.warn(`Duplicate solution for Q${s.questionNumber} in ${path.basename(file)} — keeping the earlier one.`);
          continue;
        }
        solutions.set(s.questionNumber, s.explanation);
      }
    } catch (err) {
      console.error(`Failed to read solutions page ${path.basename(file)}:`, err);
    }
  }

  console.log(`Parsed ${solutions.size} solution(s).`);
  return solutions;
}

async function loadSubjectMap(): Promise<Map<string, string>> {
  const { rows } = await pgPool.query<{ id: string; name: string }>(`SELECT id, name FROM subjects`);
  const map = new Map<string, string>();
  for (const row of rows) map.set(row.name.toLowerCase(), row.id);
  return map;
}

function matchSubjectId(guess: string | undefined, subjectMap: Map<string, string>): string | null {
  if (!guess) return null;
  const lower = guess.toLowerCase();
  for (const [name, id] of subjectMap) {
    if (lower.includes(name) || name.includes(lower)) return id;
  }
  return null;
}

interface TopicRow {
  id: string;
  subjectId: string;
  name: string;
}

async function loadTopics(): Promise<TopicRow[]> {
  const { rows } = await pgPool.query<{ id: string; subject_id: string; name: string }>(
    `SELECT id, subject_id, name FROM topic_hierarchy`
  );
  return rows.map((r) => ({ id: r.id, subjectId: r.subject_id, name: r.name }));
}

/** Matches a chapter name to a topic_hierarchy row scoped to the already-resolved subject. */
function matchTopicId(topicName: string | undefined, subjectId: string | null, topics: TopicRow[]): string | null {
  if (!topicName || !subjectId) return null;
  const lower = topicName.toLowerCase();
  const inSubject = topics.filter((t) => t.subjectId === subjectId);
  const exact = inSubject.find((t) => t.name.toLowerCase() === lower);
  if (exact) return exact.id;
  const partial = inSubject.find((t) => t.name.toLowerCase().includes(lower) || lower.includes(t.name.toLowerCase()));
  return partial?.id ?? null;
}

function saveImageToPublicDir(sourceFile: string): string {
  fs.mkdirSync(BACKEND_PUBLIC_DIR, { recursive: true });
  const ext = path.extname(sourceFile).toLowerCase();
  const fileName = `${crypto.randomUUID()}${ext}`;
  fs.copyFileSync(sourceFile, path.join(BACKEND_PUBLIC_DIR, fileName));
  return `${PUBLIC_ASSET_BASE_URL}/question-images/${fileName}`;
}

/**
 * Parses a printed source tag like "PMT/NEET-1989" into a source label and
 * year: { source: "PMT/NEET", year: 1989 }. Returns null if no 4-digit year
 * is found (tag is unusable — falls back to the CLI-supplied defaults).
 */
function parseSourceTag(tag: string | undefined): { source: string; year: number } | null {
  if (!tag) return null;
  const match = tag.match(/(\d{4})\s*$/);
  if (!match) return null;
  const year = Number(match[1]);
  const source = tag.slice(0, match.index).trim().replace(/[-/]+$/, '').trim();
  return { source: source || tag, year };
}

interface SupplementaryImage {
  file: string;
  questionNumber: number;
  optionLabel?: string;
}

/**
 * Recognizes dedicated diagram scans named like "..._question_12.png" (a
 * cleaner rescan of just that question's figure) or
 * "..._question_12_option_a.png" (a scan of just one option's figure).
 * These are NOT full exam pages — never run them through the page-extraction
 * vision prompt, or it'll try to hallucinate a whole MCQ from a single
 * cropped diagram. They're matched to an already-extracted question purely
 * by the number in the filename and attached as its image.
 */
function parseSupplementaryImageFilename(filePath: string): SupplementaryImage | null {
  const name = path.basename(filePath);
  const optionMatch = name.match(/_question_(\d+)_option_([a-dA-D])\.[^.]+$/);
  if (optionMatch) {
    return { file: filePath, questionNumber: Number(optionMatch[1]), optionLabel: optionMatch[2].toUpperCase() };
  }
  const questionMatch = name.match(/_question_(\d+)\.[^.]+$/);
  if (questionMatch) {
    return { file: filePath, questionNumber: Number(questionMatch[1]) };
  }
  return null;
}

async function extractQuestions(
  examId: string,
  source: string,
  previousYear: number | undefined,
  topicName: string | undefined,
  chapterDir: string | undefined,
  answers: Map<number, string>,
  solutions: Map<number, string>,
  subjectMap: Map<string, string>,
  topics: TopicRow[]
): Promise<ReviewQuestion[]> {
  const dir = resolveScanDir(QUESTIONS_DIR, chapterDir);
  const allFiles = listImageFiles(dir);
  if (allFiles.length === 0) {
    throw new Error(
      `No question images found in ${dir}. Drop scanned pages there and re-run` +
        (chapterDir ? '' : ' (or pass a chapterDir if your pages are organized into subfolders).')
    );
  }

  // Dedicated per-question/per-option diagram rescans are matched by filename
  // after the fact, not run through the page-extraction prompt (see
  // parseSupplementaryImageFilename).
  const files: string[] = [];
  const supplementaryImages: SupplementaryImage[] = [];
  for (const file of allFiles) {
    const supplementary = parseSupplementaryImageFilename(file);
    if (supplementary) {
      supplementaryImages.push(supplementary);
    } else {
      files.push(file);
    }
  }
  if (supplementaryImages.length > 0) {
    console.log(`Found ${supplementaryImages.length} dedicated question/option diagram scan(s), matched by filename.`);
  }

  const prompt = `This image is a page from a scanned multiple-choice exam paper.
Extract every question on the page. Return strict JSON only, in this exact shape:
{
  "questions": [
    {
      "questionNumber": 1,
      "questionText": "...",
      "hasQuestionImage": false,
      "options": [
        { "label": "A", "text": "...", "hasOptionImage": false },
        { "label": "B", "text": "...", "hasOptionImage": false },
        { "label": "C", "text": "...", "hasOptionImage": false },
        { "label": "D", "text": "...", "hasOptionImage": false }
      ],
      "subjectGuess": "Physics",
      "difficultyGuess": "medium",
      "sourceTag": "PMT/NEET-1989"
    }
  ]
}
Set hasQuestionImage/hasOptionImage to true ONLY when there's a diagram, graph, circuit, chemical structure, or figure
that genuinely can't be captured as text — not for plain text. subjectGuess should be one of Physics, Chemistry,
Biology, or Math if determinable, else null. If any text is genuinely illegible, put your best guess and prefix
questionText with "[UNCERTAIN] ". Many exam-paper compilations print a bracketed source/year tag next to each
question, e.g. "[PMT/NEET-1989]" or "[NEET-2004]" — if present, copy the exact tag text into sourceTag WITHOUT the
brackets (e.g. "PMT/NEET-1989"). If no such tag is printed for a question, omit sourceTag entirely.`;

  const results: ReviewQuestion[] = [];

  for (const file of files) {
    console.log(`Reading question page: ${path.basename(file)}`);
    let parsed: { questions: ExtractedQuestion[] };
    try {
      parsed = await callVisionJson(prompt, imageToDataUrl(file));
    } catch (err) {
      console.error(`Failed to read ${path.basename(file)}:`, err);
      continue;
    }

    let pageImageUrl: string | null = null;
    const pageNeedsImage = (parsed.questions ?? []).some(
      (q) => q.hasQuestionImage || q.options?.some((o) => o.hasOptionImage)
    );
    if (pageNeedsImage) {
      pageImageUrl = saveImageToPublicDir(file);
    }

    for (const q of parsed.questions ?? []) {
      const reviewNotes: string[] = [];

      const subjectId = matchSubjectId(q.subjectGuess, subjectMap);
      if (!subjectId) reviewNotes.push(`No subject match for guess "${q.subjectGuess ?? 'none'}" — set subjectId manually.`);

      const topicId = matchTopicId(topicName, subjectId, topics);
      if (topicName && !topicId) reviewNotes.push(`No topic match for "${topicName}" under the matched subject — set topicId manually.`);

      const correctOption = answers.get(q.questionNumber) ?? null;
      if (!correctOption) reviewNotes.push('No matching answer-key entry — set correctOption manually.');

      if (q.questionText?.startsWith('[UNCERTAIN]')) reviewNotes.push('Question text was hard to read — verify against the scan.');

      const parsedTag = parseSourceTag(q.sourceTag);

      results.push({
        questionNumber: q.questionNumber,
        examId,
        subjectId,
        topicId: topicId ?? undefined,
        questionText: q.questionText,
        questionImageUrl: q.hasQuestionImage ? pageImageUrl ?? undefined : undefined,
        options: (q.options ?? []).map((o) => ({
          label: o.label,
          text: o.text,
          imageUrl: o.hasOptionImage ? pageImageUrl ?? undefined : undefined,
        })),
        correctOption,
        explanation: solutions.get(q.questionNumber),
        difficulty: q.difficultyGuess ?? 'medium',
        source: parsedTag?.source ?? source,
        previousYear: parsedTag?.year ?? previousYear,
        sourceImage: path.basename(file),
        needsReview: reviewNotes.length > 0,
        reviewNotes,
      });
    }
  }

  for (const supplementary of supplementaryImages) {
    const question = results.find((r) => r.questionNumber === supplementary.questionNumber);
    if (!question) {
      console.warn(
        `${path.basename(supplementary.file)}: no extracted question #${supplementary.questionNumber} in this batch — skipping. ` +
          `(Make sure the page containing that question is also in this run.)`
      );
      continue;
    }

    const imageUrl = saveImageToPublicDir(supplementary.file);
    if (supplementary.optionLabel) {
      const option = question.options.find((o) => o.label === supplementary.optionLabel);
      if (!option) {
        console.warn(`${path.basename(supplementary.file)}: question #${supplementary.questionNumber} has no option "${supplementary.optionLabel}" — skipping.`);
        continue;
      }
      option.imageUrl = imageUrl;
    } else {
      question.questionImageUrl = imageUrl;
    }
  }

  return results;
}

async function main() {
  const [examId, source = 'Scanned import', previousYearArg, topicName, chapterDir] = process.argv.slice(2);
  if (!examId) {
    console.error(
      'Usage: ts-node scripts/extract-scanned-questions.ts <examId> [sourceLabel] [previousYear] [topicName] [chapterDir]'
    );
    process.exit(1);
  }
  const previousYear = previousYearArg ? Number(previousYearArg) : undefined;

  const [answers, solutions, subjectMap, topics] = await Promise.all([
    extractAnswerKey(chapterDir),
    extractSolutions(chapterDir),
    loadSubjectMap(),
    loadTopics(),
  ]);
  const questions = await extractQuestions(
    examId,
    source,
    previousYear,
    topicName,
    chapterDir,
    answers,
    solutions,
    subjectMap,
    topics
  );

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outputPath = path.join(OUTPUT_DIR, `review-${Date.now()}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(questions, null, 2));

  const needsReview = questions.filter((q) => q.needsReview).length;
  const withExplanation = questions.filter((q) => q.explanation).length;
  console.log(`\nExtracted ${questions.length} question(s) -> ${outputPath}`);
  console.log(`${needsReview} need review before import (missing answer, subject match, or uncertain OCR).`);
  console.log(`${withExplanation} of ${questions.length} matched to a worked solution.`);
  console.log(`\nNext steps:`);
  console.log(`  1. Open ${path.relative(process.cwd(), outputPath)} and fix any entries with needsReview: true`);
  console.log(`     (delete the reviewNotes/needsReview/questionNumber/sourceImage fields once fixed, or leave them —`);
  console.log(`      ingest-questions.ts ignores unknown fields.)`);
  console.log(`  2. Run: npm run ingest -- ${path.relative(process.cwd(), outputPath)}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => pgPool.end());
