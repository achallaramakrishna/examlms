import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { env } from '../../config/env';

const studyPlanSchema = z.object({
  weeklyFocus: z.array(
    z.object({
      week: z.number(),
      topics: z.array(z.string()),
      goal: z.string(),
    })
  ),
  dailyHours: z.number(),
  notes: z.string(),
});

export type StudyPlan = z.infer<typeof studyPlanSchema>;

export interface StudyPlannerInput {
  targetExamName: string;
  daysUntilExam: number;
  studyHoursPerDay: number;
  strengths: string[];
  weaknesses: string[];
}

const prompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    'You are a study planner for a competitive exam student. Produce a realistic, ' +
      'week-by-week study plan that prioritizes weak topics without neglecting strengths. ' +
      'Keep the plan achievable within the student\'s daily study hours.',
  ],
  [
    'human',
    'Target exam: {targetExamName}\n' +
      'Days until exam: {daysUntilExam}\n' +
      'Study hours/day: {studyHoursPerDay}\n' +
      'Strong topics: {strengths}\n' +
      'Weak topics: {weaknesses}',
  ],
]);

// Built lazily (not at module load) so the server can boot without an OpenAI
// key configured yet — only AI-dependent requests fail until it's set.
function buildChain() {
  const llm = new ChatOpenAI({
    apiKey: env.openaiApiKey,
    model: 'gpt-4o-mini',
    temperature: 0.4,
  }).withStructuredOutput(studyPlanSchema, { name: 'study_plan' });
  return prompt.pipe(llm);
}

type Chain = ReturnType<typeof buildChain>;
let cachedChain: Chain | null = null;

function getChain(): Chain {
  if (!cachedChain) cachedChain = buildChain();
  return cachedChain;
}

/** Generates a personalized, structured study plan for a student. */
export async function generateStudyPlan(input: StudyPlannerInput): Promise<StudyPlan> {
  return getChain().invoke({
    targetExamName: input.targetExamName,
    daysUntilExam: input.daysUntilExam,
    studyHoursPerDay: input.studyHoursPerDay,
    strengths: input.strengths.join(', ') || 'none identified yet',
    weaknesses: input.weaknesses.join(', ') || 'none identified yet',
  });
}
