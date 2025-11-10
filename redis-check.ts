import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL!, {
  tls: { rejectUnauthorized: false },
});

(async () => {
  const start = Date.now();
  const pong = await redis.ping();
  console.log("✅ Redis reply:", pong);
  console.log("⚡ Latency:", Date.now() - start, "ms");
  redis.disconnect();
})();
