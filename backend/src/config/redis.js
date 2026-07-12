import IORedis from "ioredis";

/**
 * Singleton ioredis client with exponential back-off reconnection strategy.
 * All Redis services import this instance — never instantiate a second client.
 */
const redis = new IORedis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || "0", 10),
  lazyConnect: true,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redis.on("connect", () => {
  console.info("[Redis] Connection established.");
});

redis.on("error", (err) => {
  console.error("[Redis] Client error:", err.message);
});

redis.on("close", () => {
  console.warn("[Redis] Connection closed.");
});

export default redis;
