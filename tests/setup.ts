// Jest setup file
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, rmSync } from 'fs';

// Create test temp directory
const testTempDir = join(tmpdir(), 'markpaper-test');

beforeAll(() => {
  // Ensure test temp directory exists
  try {
    mkdirSync(testTempDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
});

afterAll(() => {
  // Clean up test temp directory
  try {
    rmSync(testTempDir, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
});

// Mock console methods to reduce test output noise
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging
  error: console.error,
};

// Add custom matchers if needed
expect.extend({
  toBeValidPath(received: string) {
    const pass = typeof received === 'string' && received.length > 0;
    return {
      pass,
      message: () => pass
        ? `expected ${received} not to be a valid path`
        : `expected ${received} to be a valid path`
    };
  }
});