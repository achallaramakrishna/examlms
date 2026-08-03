import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase, AppDataSource } from './config/database';
import { connectRedis } from './config/redis';

async function bootstrap(): Promise<void> {
  await connectDatabase();
  console.log('Connected to PostgreSQL');

  const rows = await AppDataSource.query(`SELECT extname FROM pg_extension WHERE extname = 'vector'`);
  if (rows.length === 0) {
    throw new Error('pgvector extension is not installed — run the InitialSchema migration first.');
  }
  console.log('pgvector extension confirmed');

  await connectRedis();
  console.log('Connected to Redis');

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`examlms backend listening on port ${env.port} (${env.nodeEnv})`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
