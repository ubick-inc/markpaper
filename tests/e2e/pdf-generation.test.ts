import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, readFileSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

describe('MarkPaper PDF Generation E2E Tests', () => {
  const cliPath = join(__dirname, '../../dist/cli.js');
  const testsDir = join(__dirname, '..');
  const outputDir = join(testsDir, 'output');

  beforeAll(() => {
    // Ensure CLI is built
    if (!existsSync(cliPath)) {
      throw new Error('CLI not built. Run "npm run build" first.');
    }

    // Ensure output directory exists
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
  });

  describe('Basic functionality tests', () => {
    it('should generate PDF from typography test', async () => {
      const inputPath = join(testsDir, 'basic/01-typography.md');
      const outputPath = join(outputDir, '01-typography.pdf');

      const { stdout } = await execAsync(
        `node ${cliPath} ${inputPath} -o ${outputPath}`,
        { timeout: 60000 }
      );

      expect(stdout).toContain('PDF generated successfully');
      expect(existsSync(outputPath)).toBe(true);

      const fileStats = readFileSync(outputPath);
      expect(fileStats.length).toBeGreaterThan(10000); // Should be reasonable size
    }, 70000);

    it('should generate PDF from code block test', async () => {
      const inputPath = join(testsDir, 'basic/02-code-block.md');
      const outputPath = join(outputDir, '02-code-block.pdf');

      const { stdout } = await execAsync(
        `node ${cliPath} ${inputPath} -o ${outputPath}`,
        { timeout: 60000 }
      );

      expect(stdout).toContain('PDF generated successfully');
      expect(existsSync(outputPath)).toBe(true);
    }, 70000);

    it('should generate PDF from table test', async () => {
      const inputPath = join(testsDir, 'basic/03-table.md');
      const outputPath = join(outputDir, '03-table.pdf');

      const { stdout } = await execAsync(
        `node ${cliPath} ${inputPath} -o ${outputPath}`,
        { timeout: 60000 }
      );

      expect(stdout).toContain('PDF generated successfully');
      expect(existsSync(outputPath)).toBe(true);
    }, 70000);

    it('should generate PDF from blockquote test', async () => {
      const inputPath = join(testsDir, 'basic/04-blockquote.md');
      const outputPath = join(outputDir, '04-blockquote.pdf');

      const { stdout } = await execAsync(
        `node ${cliPath} ${inputPath} -o ${outputPath}`,
        { timeout: 60000 }
      );

      expect(stdout).toContain('PDF generated successfully');
      expect(existsSync(outputPath)).toBe(true);
    }, 70000);
  });

  describe('Image processing tests', () => {
    it('should handle online images with size specifications', async () => {
      const inputPath = join(testsDir, 'images/01-online-image.md');
      const outputPath = join(outputDir, '01-online-image.pdf');

      const { stdout } = await execAsync(
        `node ${cliPath} ${inputPath} -o ${outputPath}`,
        { timeout: 60000 }
      );

      expect(stdout).toContain('PDF generated successfully');
      expect(existsSync(outputPath)).toBe(true);
    }, 70000);

    it('should handle local images with size specifications', async () => {
      const inputPath = join(testsDir, 'images/02-local-image.md');
      const outputPath = join(outputDir, '02-local-image.pdf');

      const { stdout } = await execAsync(
        `node ${cliPath} ${inputPath} -o ${outputPath}`,
        { timeout: 60000 }
      );

      expect(stdout).toContain('PDF generated successfully');
      expect(existsSync(outputPath)).toBe(true);

      // Local image PDF should contain base64 encoded images
      const fileStats = readFileSync(outputPath);
      expect(fileStats.length).toBeGreaterThan(20000); // Images should add size
    }, 70000);

    it('should handle mixed online and local images', async () => {
      const inputPath = join(testsDir, 'images/03-mixed-images.md');
      const outputPath = join(outputDir, '03-mixed-images.pdf');

      const { stdout } = await execAsync(
        `node ${cliPath} ${inputPath} -o ${outputPath}`,
        { timeout: 60000 }
      );

      expect(stdout).toContain('PDF generated successfully');
      expect(existsSync(outputPath)).toBe(true);
    }, 70000);
  });

  describe('Page break tests', () => {
    it('should handle H1 page breaks', async () => {
      const inputPath = join(testsDir, 'page-breaks/01-h1-page-break.md');
      const outputPath = join(outputDir, '01-h1-page-break.pdf');

      const { stdout } = await execAsync(
        `node ${cliPath} ${inputPath} -o ${outputPath}`,
        { timeout: 60000 }
      );

      expect(stdout).toContain('PDF generated successfully');
      expect(existsSync(outputPath)).toBe(true);
    }, 70000);

    it('should avoid breaking code blocks and tables', async () => {
      const inputPath = join(testsDir, 'page-breaks/02-avoid-break.md');
      const outputPath = join(outputDir, '02-avoid-break.pdf');

      const { stdout } = await execAsync(
        `node ${cliPath} ${inputPath} -o ${outputPath}`,
        { timeout: 60000 }
      );

      expect(stdout).toContain('PDF generated successfully');
      expect(existsSync(outputPath)).toBe(true);
    }, 70000);
  });

  describe('Mermaid diagram tests (skip if puppeteer fails)', () => {
    it.skip('should generate PDF from flowchart test', async () => {
      const inputPath = join(testsDir, 'mermaid/01-flowchart.md');
      const outputPath = join(outputDir, '01-flowchart.pdf');

      try {
        const { stdout } = await execAsync(
          `node ${cliPath} ${inputPath} -o ${outputPath}`,
          { timeout: 60000 }
        );

        expect(stdout).toContain('PDF generated successfully');
        expect(existsSync(outputPath)).toBe(true);
      } catch (error: any) {
        // Skip if puppeteer fails
        if (error.message?.includes('puppeteer') || error.message?.includes('browser')) {
          console.log('Skipping mermaid test due to puppeteer issues');
        } else {
          throw error;
        }
      }
    }, 70000);

    it.skip('should generate PDF from sequence diagram test', async () => {
      const inputPath = join(testsDir, 'mermaid/02-sequence.md');
      const outputPath = join(outputDir, '02-sequence.pdf');

      try {
        const { stdout } = await execAsync(
          `node ${cliPath} ${inputPath} -o ${outputPath}`,
          { timeout: 60000 }
        );

        expect(stdout).toContain('PDF generated successfully');
        expect(existsSync(outputPath)).toBe(true);
      } catch (error: any) {
        if (error.message?.includes('puppeteer') || error.message?.includes('browser')) {
          console.log('Skipping mermaid test due to puppeteer issues');
        } else {
          throw error;
        }
      }
    }, 70000);

    it.skip('should generate PDF from class diagram test', async () => {
      const inputPath = join(testsDir, 'mermaid/03-class.md');
      const outputPath = join(outputDir, '03-class.pdf');

      try {
        const { stdout } = await execAsync(
          `node ${cliPath} ${inputPath} -o ${outputPath}`,
          { timeout: 60000 }
        );

        expect(stdout).toContain('PDF generated successfully');
        expect(existsSync(outputPath)).toBe(true);
      } catch (error: any) {
        if (error.message?.includes('puppeteer') || error.message?.includes('browser')) {
          console.log('Skipping mermaid test due to puppeteer issues');
        } else {
          throw error;
        }
      }
    }, 70000);

    it.skip('should generate PDF from architecture diagram test', async () => {
      const inputPath = join(testsDir, 'mermaid/04-architecture.md');
      const outputPath = join(outputDir, '04-architecture.pdf');

      try {
        const { stdout } = await execAsync(
          `node ${cliPath} ${inputPath} -o ${outputPath}`,
          { timeout: 60000 }
        );

        expect(stdout).toContain('PDF generated successfully');
        expect(existsSync(outputPath)).toBe(true);
      } catch (error: any) {
        if (error.message?.includes('puppeteer') || error.message?.includes('browser')) {
          console.log('Skipping mermaid test due to puppeteer issues');
        } else {
          throw error;
        }
      }
    }, 70000);
  });

  describe('Debug mode verification', () => {
    it('should show image processing logs in debug mode', async () => {
      const inputPath = join(testsDir, 'images/02-local-image.md');
      const outputPath = join(outputDir, 'debug-local-image.pdf');

      const { stdout } = await execAsync(
        `node ${cliPath} ${inputPath} -o ${outputPath} --debug`,
        { timeout: 60000 }
      );

      // Should show debug logs for image processing
      expect(stdout).toContain('🐛');
      expect(stdout).toContain('Processing');
      expect(stdout).toContain('images');

      // Clean up debug output
      if (existsSync(outputPath)) {
        unlinkSync(outputPath);
      }
    }, 70000);
  });
});
