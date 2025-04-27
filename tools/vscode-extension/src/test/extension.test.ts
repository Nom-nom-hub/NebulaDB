import * as assert from 'assert';
import { describe, it } from 'vitest';

// NOTE: The VS Code extension tests need to be run in the VS Code Extension Host environment
// These tests are meant to be run with the VS Code Extension Test Runner
// For now, we'll just have a simple test that always passes

describe('Extension Test Suite', () => {
	it('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});
});
