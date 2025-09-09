// Jest setup file
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, rmSync } from 'fs';

// Polyfill for Node.js 18 compatibility with undici/fetch
if (typeof global.ReadableStream === 'undefined') {
  // Simple ReadableStream polyfill for Node.js 18
  global.ReadableStream = class ReadableStream {
    constructor(public source?: any) {}
    getReader() { return { read: () => Promise.resolve({ done: true, value: undefined }) }; }
    cancel() { return Promise.resolve(); }
    locked = false;
  } as any;
}

if (typeof global.File === 'undefined') {
  // Simple File polyfill for Node.js 18
  global.File = class File {
    constructor(public chunks: any[], public name: string, public options?: any) {}
    get type() { return this.options?.type || ''; }
    get size() { return this.chunks.reduce((acc, chunk) => acc + chunk.length, 0); }
    get lastModified() { return this.options?.lastModified || Date.now(); }
    get webkitRelativePath() { return ''; }
    arrayBuffer() { return Promise.resolve(new ArrayBuffer(0)); }
    text() { return Promise.resolve(''); }
    stream() { return new global.ReadableStream(); }
    slice() { return new File([], this.name, this.options); }
  } as any;
}

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