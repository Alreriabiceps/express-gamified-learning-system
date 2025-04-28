require('dotenv').config();

module.exports = {
    // Server Configuration
    server: {
        port: process.env.PORT || 5000,
        env: process.env.NODE_ENV || 'development'
    },

    // Client URLs
    clientUrls: [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://vite-gamified-learning-system.vercel.app',
        'https://alreria-alreriabiceps-projects.vercel.app'
    ],

    // API Configuration
    api: {
        prefix: '/api',
        version: '1.0.0'
    },

    // Logging Configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'combined'
    },

    // Security Configuration
    security: {
        rateLimit: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100 // limit each IP to 100 requests per windowMs
        }
    }
}; 