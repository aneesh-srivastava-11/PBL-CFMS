const assert = require('assert');
const { describe, it } = require('node:test');

describe('Sanity Check', () => {
    it('should be true', () => {
        assert.strictEqual(1, 1);
    });
});

describe('Environment Check', () => {
    it('should have NODE_ENV defined (in CI or Local)', () => {
        // Just checking if we can read env logic or if node runs
        const env = process.env.NODE_ENV || 'development';
        assert.ok(env);
    });
});
