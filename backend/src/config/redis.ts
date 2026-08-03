import { createClient, RedisClientType } from 'redis';
import { env } from './env';

export const redisClient: RedisClientType = createClient({ url: env.redisUrl });

redisClient.on('error', (err) => {
  console.error('Redis client error:', err);
});

export async function connectRedis(): Promise<void> {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}
