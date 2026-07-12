import { randomUUID } from "crypto";
import redis from "../../../config/redis.js";
import { REDIS_KEY_SESSION, SESSION_TTL_SECONDS } from "../../../constants/auth.constants.js";

/**
 * SessionService — manages HTTP-only cookie session lifecycle in Redis.
 * Controllers must use this service; never access Redis directly for sessions.
 */

/**
 * Creates a new session for a user and stores it in Redis.
 *
 * @param {string} userId - The user's database ID.
 * @param {Record<string, any>} userData - Serializable user metadata to store (e.g. email, name).
 * @returns {Promise<string>} The generated session ID (to be set as a cookie value).
 */
export async function createSession(userId, userData) {
  const sessionId = randomUUID();
  const key = REDIS_KEY_SESSION(sessionId);

  const payload = JSON.stringify({
    userId,
    ...userData,
    createdAt: new Date().toISOString(),
  });

  await redis.setex(key, SESSION_TTL_SECONDS, payload);
  return sessionId;
}

/**
 * Retrieves and parses session data from Redis.
 *
 * @param {string} sessionId - The session ID from the cookie.
 * @returns {Promise<Record<string, any>|null>} Parsed session data, or null if not found / expired.
 */
export async function getSession(sessionId) {
  if (!sessionId) return null;
  const key = REDIS_KEY_SESSION(sessionId);
  const raw = await redis.get(key);
  if (!raw) return null;
  return JSON.parse(raw);
}

/**
 * Deletes a single session from Redis (logout).
 *
 * @param {string} sessionId - The session ID to invalidate.
 * @returns {Promise<void>}
 */
export async function deleteSession(sessionId) {
  if (!sessionId) return;
  const key = REDIS_KEY_SESSION(sessionId);
  await redis.del(key);
}

/**
 * Invalidates ALL active sessions for a given user (used after password reset).
 * Uses Redis SCAN to safely iterate keys without blocking the server.
 *
 * @param {string} userId - The user whose sessions should be invalidated.
 * @returns {Promise<number>} Number of sessions deleted.
 */
export async function invalidateUserSessions(userId) {
  const pattern = "session:*";
  const keysToDelete = [];
  let cursor = "0";

  do {
    const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
    cursor = nextCursor;

    for (const key of keys) {
      const raw = await redis.get(key);
      if (!raw) continue;
      try {
        const data = JSON.parse(raw);
        if (data.userId === userId) keysToDelete.push(key);
      } catch {
        // Malformed entry — skip
      }
    }
  } while (cursor !== "0");

  if (keysToDelete.length > 0) {
    await redis.del(...keysToDelete);
  }

  return keysToDelete.length;
}
