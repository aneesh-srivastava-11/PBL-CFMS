const { Queue } = require('bullmq');

// BullMQ connection config - supports Upstash Redis via TLS
const connection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
    // Required for BullMQ with Upstash/serverless Redis
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    connectTimeout: 10000,
    disconnectTimeout: 10000,
    family: 0 // Allow IPv6 / IPv4 flexibility for Vercel
};

const pdfQueue = new Queue('pdf-generation', { connection });

module.exports = { pdfQueue, connection };
