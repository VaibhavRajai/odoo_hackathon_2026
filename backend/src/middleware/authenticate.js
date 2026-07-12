import { getSession } from "../modules/auth/redis/session.service.js";
import { SESSION_COOKIE_NAME } from "../constants/auth.constants.js";

/**
 * authenticate — session middleware.
 *
 * Reads the `sid` cookie, validates the session in Redis,
 * and attaches the session data to `req.user`.
 *
 * Usage: apply to any route that requires an authenticated user.
 *
 * @example
 * router.get("/protected", authenticate, handler);
 */
export async function authenticate(req, res, next) {
  const sessionId = req.cookies?.[SESSION_COOKIE_NAME];

  if (!sessionId) {
    return res.status(401).json({ success: false, message: "Authentication required." });
  }

  const session = await getSession(sessionId);

  if (!session) {
    return res.status(401).json({ success: false, message: "Session expired. Please log in again." });
  }

  req.user = session;
  next();
}

/**
 * requireRole — role-based access middleware.
 * Must be used after `authenticate`.
 *
 * @param {...string} roles - Allowed role names (e.g. "Fleet Manager", "Dispatcher").
 *
 * @example
 * router.get("/fleet", authenticate, requireRole("Fleet Manager"), handler);
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource.",
      });
    }
    next();
  };
}
