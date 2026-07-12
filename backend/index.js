import "dotenv/config";
import app from "./src/app.js";
import redis from "./src/config/redis.js";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.info(`[TransitOps] Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await redis.quit();
  process.exit(0);
});

process.on("SIGINT", async () => {
  await redis.quit();
  process.exit(0);
});
