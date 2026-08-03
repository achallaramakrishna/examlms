import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { env } from '../../config/env';
import { retrieveContext, formatContextForPrompt } from './retriever';

const answerPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    'You are an exam-prep tutor. Use the related questions below as context ' +
      'when they are relevant, but answer the student\'s actual question directly ' +
      'and concisely. If the context is not relevant, ignore it.\n\nContext:\n{context}',
  ],
  ['human', '{question}'],
]);

// Built lazily (not at module load) so the server can boot without an OpenAI
// key configured yet — only AI-dependent requests fail until it's set.
function buildChain() {
  const llm = new ChatOpenAI({
    apiKey: env.openaiApiKey,
    model: 'gpt-4o-mini',
    temperature: 0.3,
  });
  return answerPrompt.pipe(llm).pipe(new StringOutputParser());
}

type Chain = ReturnType<typeof buildChain>;
let cachedChain: Chain | null = null;

function getChain(): Chain {
  if (!cachedChain) cachedChain = buildChain();
  return cachedChain;
}

/**
 * End-to-end RAG: retrieve related questions from pgvector, feed them as
 * context to the LLM, and return a grounded answer. Used by the
 * doubt-resolver agent.
 */
export async function answerWithRag(
  question: string,
  options: { examId?: string; subjectId?: string } = {}
): Promise<{ answer: string; sources: string[] }> {
  const context = await retrieveContext(question, options);

  const answer = await getChain().invoke({
    question,
    context: formatContextForPrompt(context),
  });

  return {
    answer,
    sources: context.map((c) => c.questionId),
  };
}
