require("dotenv").config();

module.exports = {
  // Server Configuration
  server: {
    port: process.env.PORT || 5000,
    env: process.env.NODE_ENV || "development",
  },

  // Client URLs
  clientUrls: [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:4173", // Vite preview port
    "http://127.0.0.1:4173",
    "http://localhost:8080", // Common dev port
    "http://127.0.0.1:8080",
    "https://alreria.vercel.app",
    "https://your-frontend.vercel.app",
    "https://alreria-alreriabiceps-projects.vercel.app",
    "https://agilacabiao.vercel.app",
    undefined, // Allow undefined origin for local development
  ],

  // API Configuration
  api: {
    prefix: "/api",
    version: "1.0.0",
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || "info",
    format: process.env.LOG_FORMAT || "combined",
  },

  // Security Configuration
  security: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    },
  },
};
