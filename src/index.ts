import { PDFGenerator } from './converter/pdf';
import { loadConfig, mergeOptions } from './config/loader';
import { MarkPaperConfig, CLIOptions } from './config/types';
import { Logger } from './utils/logger';
import { basename, extname, join, dirname } from 'path';

export { MarkPaperConfig, CLIOptions } from './config/types';

/**
 * Main MarkPaper class
 */
export class MarkPaper {
  private config: MarkPaperConfig;
  private logger: Logger;

  constructor(config?: Partial<MarkPaperConfig>) {
    this.config = config ? mergeOptions(loadConfig(), config) : loadConfig();
    this.logger = new Logger(this.config.debug);
  }

  /**
   * Convert markdown file to PDF
   */
  async convert(inputPath: string, outputPath?: string): Promise<void> {
    // Determine output path
    const finalOutputPath = outputPath || this.generateOutputPath(inputPath);

    this.logger.info(`Converting ${inputPath} to ${finalOutputPath}`);

    const pdfGenerator = new PDFGenerator(this.config, this.logger);
    await pdfGenerator.generate(inputPath, finalOutputPath);
  }

  /**
   * Generate output path from input path
   */
  private generateOutputPath(inputPath: string): string {
    if (this.config.output) {
      return this.config.output;
    }

    const dir = dirname(inputPath);
    const name = basename(inputPath, extname(inputPath));
    return join(dir, `${name}.pdf`);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MarkPaperConfig>): void {
    this.config = mergeOptions(this.config, config);
    this.logger.setDebug(this.config.debug || false);
  }

  /**
   * Get current configuration
   */
  getConfig(): MarkPaperConfig {
    return { ...this.config };
  }
}

/**
 * Convenience function for quick conversion
 */
export async function convertMarkdownToPDF(
  inputPath: string,
  outputPath?: string,
  config?: Partial<MarkPaperConfig>
): Promise<void> {
  const markPaper = new MarkPaper(config);
  await markPaper.convert(inputPath, outputPath);
}

export default MarkPaper;