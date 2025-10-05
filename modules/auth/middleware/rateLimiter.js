/**
 * Rate limiting middleware to prevent brute force attacks
 * Stores login attempts in memory
 */

const loginAttempts = new Map();

// Configuration
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const BLOCK_DURATION = 30 * 60 * 1000; // 30 minutes

/**
 * Clean up old entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of loginAttempts.entries()) {
    if (now - data.firstAttempt > WINDOW_MS && data.count === 0) {
      loginAttempts.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

/**
 * Rate limiter for login routes
 */
const loginRateLimiter = (req, res, next) => {
  const identifier = req.body.username || req.body.studentId || req.ip;
  const key = `${identifier}_${req.ip}`;
  const now = Date.now();

  const attemptData = loginAttempts.get(key);

  if (!attemptData) {
    // First attempt
    loginAttempts.set(key, {
      count: 1,
      firstAttempt: now,
      lastAttempt: now,
      blocked: false,
    });
    return next();
  }

  // Check if user is currently blocked
  if (attemptData.blocked) {
    const timeSinceBlock = now - attemptData.lastAttempt;
    if (timeSinceBlock < BLOCK_DURATION) {
      const remainingTime = Math.ceil(
        (BLOCK_DURATION - timeSinceBlock) / 1000 / 60
      );
      return res.status(429).json({
        error: `Too many login attempts. Please try again in ${remainingTime} minutes.`,
      });
    } else {
      // Unblock and reset
      attemptData.count = 1;
      attemptData.firstAttempt = now;
      attemptData.lastAttempt = now;
      attemptData.blocked = false;
      return next();
    }
  }

  // Check if we're within the time window
  const timeSinceFirst = now - attemptData.firstAttempt;

  if (timeSinceFirst > WINDOW_MS) {
    // Reset window
    attemptData.count = 1;
    attemptData.firstAttempt = now;
    attemptData.lastAttempt = now;
    return next();
  }

  // Increment attempt count
  attemptData.count++;
  attemptData.lastAttempt = now;

  if (attemptData.count > MAX_ATTEMPTS) {
    attemptData.blocked = true;
    return res.status(429).json({
      error: `Too many login attempts. Please try again in ${Math.ceil(
        BLOCK_DURATION / 1000 / 60
      )} minutes.`,
    });
  }

  // Add remaining attempts to response headers
  res.setHeader("X-RateLimit-Limit", MAX_ATTEMPTS);
  res.setHeader(
    "X-RateLimit-Remaining",
    Math.max(0, MAX_ATTEMPTS - attemptData.count)
  );

  next();
};

/**
 * Reset login attempts on successful login
 */
const resetLoginAttempts = (req) => {
  const identifier = req.body.username || req.body.studentId || req.ip;
  const key = `${identifier}_${req.ip}`;
  loginAttempts.delete(key);
};

module.exports = {
  loginRateLimiter,
  resetLoginAttempts,
};
