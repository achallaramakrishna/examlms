import { OpenAIEmbeddings } from '@langchain/openai';
import { env } from '../../config/env';

// Constructed lazily (not at module load) so the server can boot without an
// OpenAI key configured yet — only AI-dependent requests fail until it's set.
let embeddings: OpenAIEmbeddings | null = null;

function getEmbeddings(): OpenAIEmbeddings {
  if (!embeddings) {
    embeddings = new OpenAIEmbeddings({
      apiKey: env.openaiApiKey,
      model: 'text-embedding-3-small',
    });
  }
  return embeddings;
}

export async function embedText(text: string): Promise<number[]> {
  return getEmbeddings().embedQuery(text);
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  return getEmbeddings().embedDocuments(texts);
}
