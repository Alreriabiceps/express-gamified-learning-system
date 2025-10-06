require("dotenv").config();

module.exports = {
  secret: process.env.JWT_SECRET || "your-secret-key",
  expiresIn: process.env.JWT_EXPIRE || "2h", // Extended from 15m to 2h
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE || "7d",

  // Token types
  tokenTypes: {
    ACCESS: "access",
    REFRESH: "refresh",
  },

  // Token cookie options
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 2 * 60 * 60 * 1000, // 2 hours (updated to match token expiry)
  },
};
