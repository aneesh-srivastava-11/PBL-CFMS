// Conditional logger utility - only logs in development
const logger = {
    debug: (message, ...args) => {
        if (process.env.NODE_ENV !== 'production') {
            console.log(message, ...args);
        }
    },
    info: (message, ...args) => {
        console.log(message, ...args);
    },
    warn: (message, ...args) => {
        console.warn(message, ...args);
    },
    error: (message, ...args) => {
        console.error(message, ...args);
    }
};

module.exports = logger;
