import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

describe('MarkPaper CLI E2E Tests', () => {
  const cliPath = join(__dirname, '../../dist/cli.js');
  const fixturesDir = join(__dirname, '../fixtures');
  const tempDir = join(tmpdir(), 'markpaper-e2e-test');

  beforeAll(() => {
    // Ensure CLI is built
    if (!existsSync(cliPath)) {
      throw new Error('CLI not built. Run "npm run build" first.');
    }
  });

  describe('Basic functionality', () => {
    it('should display help when no arguments provided', async () => {
      try {
        await execAsync(`node ${cliPath}`);
      } catch (error: any) {
        expect(error.code).toBe(1);
        expect(error.stderr || error.stdout).toContain('error: missing required argument');
      }
    });

    it('should display version', async () => {
      const { stdout } = await execAsync(`node ${cliPath} --version`);
      expect(stdout).toMatch(/\d+\.\d+\.\d+/);
    });

    it('should display help with --help flag', async () => {
      const { stdout } = await execAsync(`node ${cliPath} --help`);
      expect(stdout).toContain('Beautiful Markdown to PDF converter');
      expect(stdout).toContain('Options:');
      expect(stdout).toContain('--output');
    });
  });

  describe('PDF generation', () => {
    const testOutputPath = join(tempDir, 'test-output.pdf');

    afterEach(() => {
      // Clean up generated files
      if (existsSync(testOutputPath)) {
        unlinkSync(testOutputPath);
      }
    });

    it('should generate PDF from simple markdown', async () => {
      const inputPath = join(fixturesDir, 'simple.md');
      
      const { stdout, stderr } = await execAsync(
        `node ${cliPath} ${inputPath} -o ${testOutputPath}`,
        { timeout: 30000 }
      );

      // Check for success message
      expect(stdout).toContain('PDF generated successfully');
      
      // Check that PDF file was created
      expect(existsSync(testOutputPath)).toBe(true);
      
      // Check that PDF has content (not empty)
      const fileStats = readFileSync(testOutputPath);
      expect(fileStats.length).toBeGreaterThan(1000); // PDF should be at least 1KB
    });

    it('should handle custom output path', async () => {
      const inputPath = join(fixturesDir, 'simple.md');
      const customOutput = join(tempDir, 'custom-name.pdf');
      
      await execAsync(
        `node ${cliPath} ${inputPath} -o ${customOutput}`,
        { timeout: 30000 }
      );

      expect(existsSync(customOutput)).toBe(true);
      
      // Clean up
      if (existsSync(customOutput)) {
        unlinkSync(customOutput);
      }
    });

    it('should use default output name when not specified', async () => {
      const inputPath = join(fixturesDir, 'simple.md');
      const expectedOutput = join(fixturesDir, 'simple.pdf');
      
      try {
        await execAsync(
          `node ${cliPath} ${inputPath}`,
          { timeout: 30000 }
        );

        expect(existsSync(expectedOutput)).toBe(true);
      } finally {
        // Clean up
        if (existsSync(expectedOutput)) {
          unlinkSync(expectedOutput);
        }
      }
    });
  });

  describe('Configuration options', () => {
    it('should accept font configuration', async () => {
      const inputPath = join(fixturesDir, 'simple.md');
      const outputPath = join(tempDir, 'font-test.pdf');
      
      const { stdout } = await execAsync(
        `node ${cliPath} ${inputPath} -o ${outputPath} --font-main "Arial" --font-size 14`,
        { timeout: 30000 }
      );

      expect(stdout).toContain('PDF generated successfully');
      expect(existsSync(outputPath)).toBe(true);
      
      // Clean up
      if (existsSync(outputPath)) {
        unlinkSync(outputPath);
      }
    });

    it('should accept page configuration', async () => {
      const inputPath = join(fixturesDir, 'simple.md');
      const outputPath = join(tempDir, 'page-test.pdf');
      
      const { stdout } = await execAsync(
        `node ${cliPath} ${inputPath} -o ${outputPath} --page-size Letter --margin-top 3cm`,
        { timeout: 30000 }
      );

      expect(stdout).toContain('PDF generated successfully');
      expect(existsSync(outputPath)).toBe(true);
      
      // Clean up
      if (existsSync(outputPath)) {
        unlinkSync(outputPath);
      }
    });

    it('should load configuration from file', async () => {
      const inputPath = join(fixturesDir, 'simple.md');
      const outputPath = join(tempDir, 'config-test.pdf');
      const configPath = join(tempDir, 'test-config.js');
      
      // Create test config file
      const configContent = `
        module.exports = {
          output: '${outputPath}',
          font: {
            size: 13
          },
          page: {
            size: 'A4'
          }
        };
      `;
      writeFileSync(configPath, configContent);
      
      try {
        const { stdout } = await execAsync(
          `node ${cliPath} ${inputPath} -c ${configPath}`,
          { timeout: 30000 }
        );

        expect(stdout).toContain('PDF generated successfully');
        expect(existsSync(outputPath)).toBe(true);
      } finally {
        // Clean up
        if (existsSync(outputPath)) {
          unlinkSync(outputPath);
        }
        if (existsSync(configPath)) {
          unlinkSync(configPath);
        }
      }
    });
  });

  describe('Error handling', () => {
    it('should handle non-existent input file', async () => {
      const nonExistentPath = join(fixturesDir, 'non-existent.md');
      
      try {
        await execAsync(`node ${cliPath} ${nonExistentPath}`);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.code).toBe(1);
        expect(error.stderr || error.stdout).toContain('ENOENT');
      }
    });

    it('should handle invalid config file', async () => {
      const inputPath = join(fixturesDir, 'simple.md');
      const invalidConfigPath = join(tempDir, 'invalid-config.js');
      
      // Create invalid config file
      writeFileSync(invalidConfigPath, 'this is not valid javascript');
      
      try {
        await execAsync(`node ${cliPath} ${inputPath} -c ${invalidConfigPath}`);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.code).toBe(1);
      } finally {
        // Clean up
        if (existsSync(invalidConfigPath)) {
          unlinkSync(invalidConfigPath);
        }
      }
    });
  });

  describe('Debug mode', () => {
    it('should show debug output when --debug flag is used', async () => {
      const inputPath = join(fixturesDir, 'simple.md');
      const outputPath = join(tempDir, 'debug-test.pdf');
      
      const { stdout } = await execAsync(
        `node ${cliPath} ${inputPath} -o ${outputPath} --debug`,
        { timeout: 30000 }
      );

      // Debug output should contain detailed logs
      expect(stdout).toContain('🐛');
      expect(stdout).toContain('Created temporary directory');
      expect(stdout).toContain('Converting markdown to HTML');
      
      // Clean up
      if (existsSync(outputPath)) {
        unlinkSync(outputPath);
      }
    });
  });
});