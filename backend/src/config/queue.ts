import Queue from 'bull';
import { env } from './env';

/**
 * Shared Bull queue for background jobs (PDF parsing, batch embedding generation,
 * Weaviate indexing). Uses the same Redis instance as the rest of the app.
 */
export const embeddingQueue = new Queue('embedding-generation', env.redisUrl);
export const ingestionQueue = new Queue('question-ingestion', env.redisUrl);
