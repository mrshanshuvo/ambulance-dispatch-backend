import Redis from "ioredis";
import { envConfig } from "./env";

let redisClient: Redis | null = null;

if (envConfig.redis.url) {
  redisClient = new Redis(envConfig.redis.url, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 200, 1000);
    },
  });

  redisClient.on("error", (err) => {
    console.warn(`[Redis] Connection warning: ${err.message}`);
  });
} else {
  console.log(
    "[Redis] No REDIS_URL configured; skipping Redis client creation.",
  );
}

export { redisClient };
