const { Queue } = require('bullmq');

const connection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined, // Useful for managed Redis like Upstash
};

const pdfQueue = new Queue('pdf-generation', { connection });

module.exports = { pdfQueue, connection };
