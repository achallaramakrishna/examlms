import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { env } from '../../config/env';

export interface PerformanceSummary {
  subject: string;
  accuracyPercent: number;
  questionsAttempted: number;
}

export interface StudentAdvisorInput {
  studentName: string;
  targetExamName?: string;
  recentPerformance: PerformanceSummary[];
}

const prompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    'You are an encouraging but honest exam-prep advisor. Given a student\'s recent ' +
      'performance by subject, give 3-4 short, specific, actionable recommendations. ' +
      'Call out both the strongest and weakest subjects by name.',
  ],
  ['human', 'Student: {studentName}\nTarget exam: {targetExamName}\nRecent performance:\n{performance}'],
]);

// Built lazily (not at module load) so the server can boot without an OpenAI
// key configured yet — only AI-dependent requests fail until it's set.
function buildChain() {
  const llm = new ChatOpenAI({
    apiKey: env.openaiApiKey,
    model: 'gpt-4o-mini',
    temperature: 0.5,
  });
  return prompt.pipe(llm).pipe(new StringOutputParser());
}

type Chain = ReturnType<typeof buildChain>;
let cachedChain: Chain | null = null;

function getChain(): Chain {
  if (!cachedChain) cachedChain = buildChain();
  return cachedChain;
}

/** Produces personalized, natural-language advice from a student's recent performance metrics. */
export async function getAdvisorRecommendation(input: StudentAdvisorInput): Promise<string> {
  const performanceText = input.recentPerformance
    .map((p) => `- ${p.subject}: ${p.accuracyPercent}% accuracy over ${p.questionsAttempted} questions`)
    .join('\n');

  return getChain().invoke({
    studentName: input.studentName,
    targetExamName: input.targetExamName ?? 'not yet selected',
    performance: performanceText || 'No mock tests attempted yet.',
  });
}
