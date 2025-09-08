import { writeFile, readFile, mkdir, remove } from 'fs-extra';
import { join, dirname, basename, extname } from 'path';
import { tmpdir } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { MarkPaperConfig } from '../config/types';
import { Logger } from '../utils/logger';
import { MarkdownConverter } from './markdown';
import { MermaidProcessor } from './mermaid';

const execAsync = promisify(exec);

export class PDFGenerator {
  private config: MarkPaperConfig;
  private logger: Logger;
  private markdownConverter: MarkdownConverter;
  private mermaidProcessor: MermaidProcessor;

  constructor(config: MarkPaperConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.markdownConverter = new MarkdownConverter(config, logger);
    this.mermaidProcessor = new MermaidProcessor(config.mermaid || {}, logger);
  }

  /**
   * Generate PDF from markdown file
   */
  async generate(inputPath: string, outputPath: string): Promise<void> {
    const tempDir = join(tmpdir(), `markpaper-${Date.now()}`);
    
    try {
      await mkdir(tempDir, { recursive: true });
      this.logger.debugLog(`Created temporary directory: ${tempDir}`);

      // Read markdown content
      const markdown = await readFile(inputPath, 'utf-8');
      this.logger.info('Processing markdown content...');

      // Extract and process mermaid diagrams
      const mermaidDiagrams = this.markdownConverter.extractMermaidDiagrams(markdown);
      const processedDiagrams = await this.mermaidProcessor.processDiagrams(
        mermaidDiagrams,
        join(tempDir, 'diagrams')
      );

      // Convert markdown to HTML
      let html = await this.markdownConverter.convert(markdown);

      // Replace mermaid blocks with images
      html = this.markdownConverter.replaceMermaidBlocks(html, processedDiagrams);

      // Create complete HTML document
      const fullHtml = await this.createFullHTML(html, tempDir);

      // Write HTML file
      const htmlPath = join(tempDir, 'document.html');
      await writeFile(htmlPath, fullHtml);
      this.logger.debugLog(`Created HTML file: ${htmlPath}`);

      // Generate PDF using Vivliostyle
      await this.generatePDFWithVivliostyle(htmlPath, outputPath);

      this.logger.success(`PDF generated successfully: ${outputPath}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to generate PDF: ${errorMessage}`);
      throw error;
    } finally {
      // Cleanup
      await this.mermaidProcessor.cleanup();
      try {
        await remove(tempDir);
        this.logger.debugLog(`Cleaned up temporary directory: ${tempDir}`);
      } catch (error) {
        this.logger.warn(`Failed to clean up temp directory: ${error}`);
      }
    }
  }

  /**
   * Create complete HTML document with styles
   */
  private async createFullHTML(content: string, tempDir: string): Promise<string> {
    // Read base CSS
    const baseCSSPath = join(__dirname, '..', 'styles', 'base.css');
    let css = await readFile(baseCSSPath, 'utf-8');

    // Apply configuration to CSS
    css = this.applyCSSVariables(css);

    // Read custom CSS if specified
    if (this.config.css) {
      try {
        const customCSS = await readFile(this.config.css, 'utf-8');
        css += '\n\n/* Custom CSS */\n' + customCSS;
      } catch (error) {
        this.logger.warn(`Failed to read custom CSS file: ${this.config.css}`);
      }
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <style>
    ${css}
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
  }

  /**
   * Apply configuration to CSS variables
   */
  private applyCSSVariables(css: string): string {
    let result = css;

    // Font configuration
    if (this.config.font?.main) {
      result = result.replace(/--font-main: [^;]+;/, `--font-main: ${this.config.font.main};`);
    }
    if (this.config.font?.mono) {
      result = result.replace(/--font-mono: [^;]+;/, `--font-mono: ${this.config.font.mono};`);
    }
    if (this.config.font?.heading) {
      result = result.replace(/--font-heading: [^;]+;/, `--font-heading: ${this.config.font.heading};`);
    }
    if (this.config.font?.size) {
      result = result.replace(/--font-size: [^;]+;/, `--font-size: ${this.config.font.size}pt;`);
    }

    // Page configuration
    if (this.config.page?.size) {
      result = result.replace(/--page-size: [^;]+;/, `--page-size: ${this.config.page.size};`);
    }
    if (this.config.page?.margin) {
      const margin = this.config.page.margin;
      if (margin.top) {
        result = result.replace(/--page-margin-top: [^;]+;/, `--page-margin-top: ${margin.top};`);
      }
      if (margin.right) {
        result = result.replace(/--page-margin-right: [^;]+;/, `--page-margin-right: ${margin.right};`);
      }
      if (margin.bottom) {
        result = result.replace(/--page-margin-bottom: [^;]+;/, `--page-margin-bottom: ${margin.bottom};`);
      }
      if (margin.left) {
        result = result.replace(/--page-margin-left: [^;]+;/, `--page-margin-left: ${margin.left};`);
      }
    }

    return result;
  }

  /**
   * Generate PDF using Vivliostyle CLI
   */
  private async generatePDFWithVivliostyle(htmlPath: string, outputPath: string): Promise<void> {
    this.logger.info('Generating PDF with Vivliostyle...');

    // Ensure output directory exists
    await mkdir(dirname(outputPath), { recursive: true });

    // Build Vivliostyle command
    const command = this.buildVivliostyleCommand(htmlPath, outputPath);
    
    this.logger.debugLog(`Running command: ${command}`);

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 60000 // 60 seconds timeout
      });

      if (stderr && !stderr.includes('warn')) {
        this.logger.warn(`Vivliostyle warnings: ${stderr}`);
      }

      this.logger.debugLog('Vivliostyle completed successfully');
    } catch (error) {
      this.logger.error(`Vivliostyle failed: ${error}`);
      throw new Error(`PDF generation failed: ${error}`);
    }
  }

  /**
   * Build Vivliostyle CLI command
   */
  private buildVivliostyleCommand(htmlPath: string, outputPath: string): string {
    const vivliostylePath = require.resolve('@vivliostyle/cli/dist/cli.js');
    
    let command = `node "${vivliostylePath}" build "${htmlPath}" -o "${outputPath}"`;

    // Add page size if specified
    if (this.config.page?.size) {
      command += ` --size ${this.config.page.size}`;
    }

    // Add timeout
    command += ' --timeout 60';

    return command;
  }
}