/**
 * CLI for inspecting or rebuilding the pgvector HNSW index on
 * vector_embeddings.embedding.
 *
 * Usage:
 *   ts-node scripts/index-management.ts status   # row count + index size
 *   ts-node scripts/index-management.ts reindex   # REINDEX the HNSW index (rebuild, e.g. after bulk loads)
 */
import { pgPool } from './shared';

async function status() {
  const { rows: countRows } = await pgPool.query(`SELECT count(*)::int AS count FROM vector_embeddings`);
  const { rows: sizeRows } = await pgPool.query(`
    SELECT pg_size_pretty(pg_relation_size('idx_vector_embeddings_hnsw')) AS index_size
  `);
  console.log(`Indexed embeddings: ${countRows[0].count}`);
  console.log(`HNSW index size: ${sizeRows[0].index_size}`);
}

async function reindex() {
  console.log('Rebuilding idx_vector_embeddings_hnsw (this can take a while on large tables)...');
  await pgPool.query(`REINDEX INDEX idx_vector_embeddings_hnsw`);
  console.log('Done.');
}

async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'status':
      return status();
    case 'reindex':
      return reindex();
    default:
      console.error('Usage: ts-node scripts/index-management.ts <status|reindex>');
      process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => pgPool.end());
