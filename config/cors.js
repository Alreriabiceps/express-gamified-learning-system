const config = require('./config');

module.exports = {
    origin: config.clientUrls,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Access-Control-Allow-Origin',
        'Access-Control-Allow-Headers',
        'Access-Control-Allow-Methods'
    ],
    exposedHeaders: [
        'Content-Range',
        'X-Content-Range',
        'Content-Type',
        'Authorization'
    ],
    maxAge: 600, // 10 minutes
    preflightContinue: false,
    optionsSuccessStatus: 204
}; 