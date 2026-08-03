/**
 * Embeds every question that doesn't yet have a row in vector_embeddings.
 * Useful after a bulk SQL import that bypassed the API (which normally
 * embeds on create).
 *
 * Usage: ts-node scripts/create-embeddings.ts
 */
import { pgPool, embedAndIndexQuestion } from './shared';

async function main() {
  const { rows } = await pgPool.query(`
    SELECT q.id, q.question_text
    FROM questions q
    LEFT JOIN vector_embeddings v ON v.question_id = q.id
    WHERE v.id IS NULL AND NOT q.is_deleted
  `);

  console.log(`Found ${rows.length} unembedded question(s).`);

  for (const row of rows) {
    await embedAndIndexQuestion(row.id, row.question_text);
    console.log(`Embedded question ${row.id}`);
  }

  console.log('Done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => pgPool.end());
