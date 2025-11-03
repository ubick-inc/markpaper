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
      const inputPath = join(testsDir, '01-basic-typography.md');
      const outputPath = join(outputDir, '01-basic-typography.pdf');

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
      const inputPath = join(testsDir, '02-basic-code-block.md');
      const outputPath = join(outputDir, '02-basic-code-block.pdf');

      const { stdout } = await execAsync(
        `node ${cliPath} ${inputPath} -o ${outputPath}`,
        { timeout: 60000 }
      );

      expect(stdout).toContain('PDF generated successfully');
      expect(existsSync(outputPath)).toBe(true);
    }, 70000);

    it('should generate PDF from table test', async () => {
      const inputPath = join(testsDir, '03-basic-table.md');
      const outputPath = join(outputDir, '03-basic-table.pdf');

      const { stdout } = await execAsync(
        `node ${cliPath} ${inputPath} -o ${outputPath}`,
        { timeout: 60000 }
      );

      expect(stdout).toContain('PDF generated successfully');
      expect(existsSync(outputPath)).toBe(true);
    }, 70000);

    it('should generate PDF from blockquote test', async () => {
      const inputPath = join(testsDir, '04-basic-blockquote.md');
      const outputPath = join(outputDir, '04-basic-blockquote.pdf');

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
      const inputPath = join(testsDir, '05-image-online.md');
      const outputPath = join(outputDir, '05-image-online.pdf');

      const { stdout } = await execAsync(
        `node ${cliPath} ${inputPath} -o ${outputPath}`,
        { timeout: 60000 }
      );

      expect(stdout).toContain('PDF generated successfully');
      expect(existsSync(outputPath)).toBe(true);
    }, 70000);

    it('should handle local images with size specifications', async () => {
      const inputPath = join(testsDir, '06-image-local.md');
      const outputPath = join(outputDir, '06-image-local.pdf');

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
      const inputPath = join(testsDir, '07-image-mixed.md');
      const outputPath = join(outputDir, '07-image-mixed.pdf');

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
      const inputPath = join(testsDir, '12-page-break-h1.md');
      const outputPath = join(outputDir, '12-page-break-h1.pdf');

      const { stdout } = await execAsync(
        `node ${cliPath} ${inputPath} -o ${outputPath}`,
        { timeout: 60000 }
      );

      expect(stdout).toContain('PDF generated successfully');
      expect(existsSync(outputPath)).toBe(true);
    }, 70000);

    it('should avoid breaking code blocks and tables', async () => {
      const inputPath = join(testsDir, '13-page-break-avoid.md');
      const outputPath = join(outputDir, '13-page-break-avoid.pdf');

      const { stdout } = await execAsync(
        `node ${cliPath} ${inputPath} -o ${outputPath}`,
        { timeout: 60000 }
      );

      expect(stdout).toContain('PDF generated successfully');
      expect(existsSync(outputPath)).toBe(true);
    }, 70000);
  });

  describe('Mermaid diagram tests', () => {
    it('should generate PDF from flowchart test', async () => {
      const inputPath = join(testsDir, '08-mermaid-flowchart.md');
      const outputPath = join(outputDir, '08-mermaid-flowchart.pdf');

      const { stdout } = await execAsync(
        `node ${cliPath} ${inputPath} -o ${outputPath}`,
        { timeout: 60000 }
      );

      expect(stdout).toContain('PDF generated successfully');
      expect(existsSync(outputPath)).toBe(true);

      // Mermaid PDFs should be larger due to diagram rendering
      const fileStats = readFileSync(outputPath);
      expect(fileStats.length).toBeGreaterThan(20000);
    }, 70000);

    it('should generate PDF from sequence diagram test', async () => {
      const inputPath = join(testsDir, '09-mermaid-sequence.md');
      const outputPath = join(outputDir, '09-mermaid-sequence.pdf');

      const { stdout } = await execAsync(
        `node ${cliPath} ${inputPath} -o ${outputPath}`,
        { timeout: 60000 }
      );

      expect(stdout).toContain('PDF generated successfully');
      expect(existsSync(outputPath)).toBe(true);
    }, 70000);

    it('should generate PDF from class diagram test', async () => {
      const inputPath = join(testsDir, '10-mermaid-class.md');
      const outputPath = join(outputDir, '10-mermaid-class.pdf');

      const { stdout } = await execAsync(
        `node ${cliPath} ${inputPath} -o ${outputPath}`,
        { timeout: 60000 }
      );

      expect(stdout).toContain('PDF generated successfully');
      expect(existsSync(outputPath)).toBe(true);
    }, 70000);

    it('should generate PDF from architecture diagram test', async () => {
      const inputPath = join(testsDir, '11-mermaid-architecture.md');
      const outputPath = join(outputDir, '11-mermaid-architecture.pdf');

      const { stdout } = await execAsync(
        `node ${cliPath} ${inputPath} -o ${outputPath}`,
        { timeout: 60000 }
      );

      expect(stdout).toContain('PDF generated successfully');
      expect(existsSync(outputPath)).toBe(true);
    }, 70000);
  });

  describe('Debug mode verification', () => {
    it('should show image processing logs in debug mode', async () => {
      const inputPath = join(testsDir, '06-image-local.md');
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

  describe('Page numbers and outline tests', () => {
    it('should generate PDF with page numbers when --page-numbers flag is used', async () => {
      const inputPath = join(testsDir, '14-page-numbers.md');
      const outputPath = join(outputDir, '14-page-numbers.pdf');

      const { stdout } = await execAsync(
        `node ${cliPath} ${inputPath} -o ${outputPath} --page-numbers`,
        { timeout: 60000 }
      );

      expect(stdout).toContain('PDF generated successfully');
      expect(existsSync(outputPath)).toBe(true);

      // Check file size - page numbers shouldn't add much size
      const fileStats = readFileSync(outputPath);
      expect(fileStats.length).toBeGreaterThan(10000);
    }, 70000);

    it('should generate PDF with outline (bookmarks) from headings', async () => {
      const inputPath = join(testsDir, '14-page-numbers.md');
      const outputPath = join(outputDir, '14-page-numbers-outline.pdf');

      const { stdout } = await execAsync(
        `node ${cliPath} ${inputPath} -o ${outputPath}`,
        { timeout: 60000 }
      );

      expect(stdout).toContain('PDF generated successfully');
      expect(existsSync(outputPath)).toBe(true);

      // PDF should contain headings that become bookmarks
      // Visual verification required for actual outline structure
    }, 70000);
  });

  describe('Table of contents tests', () => {
    it('should generate PDF with automatic table of contents', async () => {
      const inputPath = join(testsDir, '15-toc.md');
      const outputPath = join(outputDir, '15-toc.pdf');

      const { stdout } = await execAsync(
        `node ${cliPath} ${inputPath} -o ${outputPath}`,
        { timeout: 60000 }
      );

      expect(stdout).toContain('PDF generated successfully');
      expect(existsSync(outputPath)).toBe(true);

      // Check file size - TOC should add some content
      const fileStats = readFileSync(outputPath);
      expect(fileStats.length).toBeGreaterThan(10000);
    }, 70000);

    it('should generate TOC with hierarchical structure', async () => {
      const inputPath = join(testsDir, '15-toc.md');
      const outputPath = join(outputDir, '15-toc-hierarchy.pdf');

      const { stdout } = await execAsync(
        `node ${cliPath} ${inputPath} -o ${outputPath}`,
        { timeout: 60000 }
      );

      expect(stdout).toContain('PDF generated successfully');
      expect(existsSync(outputPath)).toBe(true);

      // Visual verification required for TOC structure and indentation
    }, 70000);
  });
});
