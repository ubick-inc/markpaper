import puppeteer, { Browser, Page } from 'puppeteer';
import { writeFile, mkdir, pathExists } from 'fs-extra';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { MermaidConfig } from '../config/types';
import { Logger } from '../utils/logger';

export class MermaidProcessor {
  private config: MermaidConfig;
  private logger: Logger;
  private browser: Browser | null = null;

  constructor(config: MermaidConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Find Chrome executable path
   */
  private async findChromeExecutable(): Promise<string | undefined> {
    const home = homedir();
    const possiblePaths = [
      // Puppeteer cache for macOS ARM
      join(home, '.cache/puppeteer/chrome/mac_arm-131.0.6778.204/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
      // System Chrome (macOS)
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      // Chromium (macOS)
      '/Applications/Chromium.app/Contents/MacOS/Chromium'
    ];

    for (const path of possiblePaths) {
      if (await pathExists(path)) {
        this.logger.debugLog(`Found Chrome at: ${path}`);
        return path;
      }
    }

    return undefined;
  }

  /**
   * Initialize puppeteer browser
   */
  private async initBrowser(): Promise<void> {
    if (!this.browser) {
      this.logger.debugLog('Launching puppeteer browser for Mermaid rendering');

      const executablePath = await this.findChromeExecutable();
      const launchOptions: any = {
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      };

      if (executablePath) {
        launchOptions.executablePath = executablePath;
        this.logger.debugLog(`Using Chrome executable: ${executablePath}`);
      }

      try {
        this.browser = await puppeteer.launch(launchOptions);
      } catch (error) {
        this.logger.error(`Failed to launch Puppeteer: ${error}`);
        // Try with minimal settings for macOS compatibility
        const fallbackOptions: any = {
          headless: 'new',
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
          ]
        };
        if (executablePath) {
          fallbackOptions.executablePath = executablePath;
        }
        this.browser = await puppeteer.launch(fallbackOptions);
      }
    }
  }

  /**
   * Close browser
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      this.logger.debugLog('Closing puppeteer browser');
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Process mermaid diagrams and return image URLs with content
   */
  async processDiagrams(
    diagrams: Array<{ id: string; content: string }>,
    outputDir: string
  ): Promise<Array<{ id: string; imageUrl: string; content: string }>> {
    if (diagrams.length === 0) {
      return [];
    }

    await this.initBrowser();
    const results: Array<{ id: string; imageUrl: string; content: string }> = [];

    // Ensure output directory exists
    await mkdir(outputDir, { recursive: true });

    for (const diagram of diagrams) {
      this.logger.debugLog(`Rendering mermaid diagram: ${diagram.id}`);

      try {
        const imageUrl = await this.renderDiagram(diagram, outputDir);
        results.push({ id: diagram.id, imageUrl, content: diagram.content });
        this.logger.debugLog(`Successfully rendered: ${diagram.id}`);
      } catch (error) {
        this.logger.error(`Failed to render mermaid diagram ${diagram.id}: ${error}`);
        // Create placeholder
        results.push({
          id: diagram.id,
          imageUrl: 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100"><text x="50%" y="50%" text-anchor="middle" dy=".3em">Mermaid Render Error</text></svg>').toString('base64'),
          content: diagram.content
        });
      }
    }

    return results;
  }

  /**
   * Render a single mermaid diagram to PNG
   */
  private async renderDiagram(
    diagram: { id: string; content: string },
    outputDir: string
  ): Promise<string> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page: Page = await this.browser.newPage();

    try {
      // Set viewport
      await page.setViewport({
        width: this.config.width || 800,
        height: 600,
        deviceScaleFactor: this.config.scale || 1
      });

      // Create HTML content with mermaid
      const html = this.createMermaidHTML(diagram.content);
      await page.setContent(html);

      // Wait for mermaid to render
      await page.waitForSelector('#mermaid-diagram svg', { timeout: 10000 });

      // Get the SVG element dimensions
      const svgElement = await page.$('#mermaid-diagram svg');
      if (!svgElement) {
        throw new Error('SVG element not found');
      }

      // Take screenshot of the SVG
      const outputPath = join(outputDir, `${diagram.id}.png`);
      await svgElement.screenshot({
        path: outputPath,
        omitBackground: (this.config.backgroundColor || 'transparent') === 'transparent'
      });

      return outputPath;
    } finally {
      await page.close();
    }
  }

  /**
   * Create HTML template for mermaid rendering
   */
  private createMermaidHTML(mermaidContent: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
        <style>
          body {
            margin: 0;
            padding: 20px;
            background: ${this.config.backgroundColor || 'transparent'};
          }
          #mermaid-diagram {
            display: flex;
            justify-content: center;
            align-items: center;
          }
        </style>
      </head>
      <body>
        <div id="mermaid-diagram">
          <div class="mermaid">
            ${mermaidContent}
          </div>
        </div>
        <script>
          mermaid.initialize({
            theme: '${this.config.theme || 'default'}',
            startOnLoad: true,
            securityLevel: 'loose'
          });
        </script>
      </body>
      </html>
    `;
  }
}
