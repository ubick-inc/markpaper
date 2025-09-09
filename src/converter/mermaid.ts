import puppeteer, { Browser, Page } from 'puppeteer';
import { writeFile, mkdir } from 'fs-extra';
import { join, dirname } from 'path';
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
   * Initialize puppeteer browser
   */
  private async initBrowser(): Promise<void> {
    if (!this.browser) {
      this.logger.debugLog('Launching puppeteer browser for Mermaid rendering');
      
      // Try different launch configurations in order of preference
      const launchConfigs = [
        // First try: Use system Chrome with specific executable path (macOS)
        {
          executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          headless: 'new' as const,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
          ]
        },
        // Second try: Default Puppeteer with minimal args
        {
          headless: 'new' as const,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
          ]
        },
        // Third try: Legacy headless mode
        {
          headless: true as const,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
      ];

      let lastError: Error | null = null;
      for (const config of launchConfigs) {
        try {
          const configDesc = 'executablePath' in config ? 
            `executablePath: ${config.executablePath}` : 
            `args: ${JSON.stringify(config.args)}`;
          this.logger.debugLog(`Trying Puppeteer launch with ${configDesc}`);
          this.browser = await puppeteer.launch(config);
          this.logger.debugLog('Puppeteer launched successfully');
          return;
        } catch (error) {
          lastError = error as Error;
          const configDesc = 'executablePath' in config ? 
            `executablePath: ${config.executablePath}` : 
            `args: ${JSON.stringify(config.args)}`;
          this.logger.debugLog(`Puppeteer launch failed with ${configDesc}: ${error}`);
        }
      }
      
      throw new Error(`Failed to launch Puppeteer after trying all configurations. Last error: ${lastError?.message}`);
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
   * Process mermaid diagrams and return image URLs
   */
  async processDiagrams(
    diagrams: Array<{ id: string; content: string }>,
    outputDir: string
  ): Promise<Array<{ id: string; imageUrl: string }>> {
    if (diagrams.length === 0) {
      return [];
    }

    await this.initBrowser();
    const results: Array<{ id: string; imageUrl: string }> = [];

    // Ensure output directory exists
    await mkdir(outputDir, { recursive: true });

    for (const diagram of diagrams) {
      this.logger.debugLog(`Rendering mermaid diagram: ${diagram.id}`);
      
      try {
        const imageUrl = await this.renderDiagram(diagram, outputDir);
        results.push({ id: diagram.id, imageUrl });
        this.logger.debugLog(`Successfully rendered: ${diagram.id}`);
      } catch (error) {
        this.logger.error(`Failed to render mermaid diagram ${diagram.id}: ${error}`);
        // Create placeholder
        results.push({ 
          id: diagram.id, 
          imageUrl: 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100"><text x="50%" y="50%" text-anchor="middle" dy=".3em">Mermaid Render Error</text></svg>').toString('base64')
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
      // Set viewport with higher resolution for better quality
      await page.setViewport({
        width: this.config.width || 1600,  // Increased width for better resolution
        height: 1200,  // Increased height
        deviceScaleFactor: this.config.scale || 2  // Higher scale factor for sharper images
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
    const layout = this.config.layout || {};
    
    // Prepare mermaid configuration
    const mermaidConfig = {
      theme: this.config.theme || 'default',
      startOnLoad: true,
      securityLevel: 'loose',
      flowchart: {
        nodeSpacing: layout.nodeSpacing || 80,
        rankSpacing: layout.rankSpacing || 100,
        curve: layout.curveStyle || 'cardinal',
        padding: layout.padding || 30,
        useMaxWidth: true,
        htmlLabels: true
      },
      sequence: {
        actorMargin: layout.nodeSpacing ? layout.nodeSpacing + 20 : 100,
        boxMargin: 20,
        boxTextMargin: 10,
        noteMargin: 20,
        messageMargin: layout.rankSpacing ? layout.rankSpacing / 2 : 50
      },
      gantt: {
        leftPadding: 120,
        gridLineStartPadding: 120,
        fontSize: 12,
        sectionFontSize: 14
      }
    };

    // Handle ELK renderer configuration
    let elkDirective = '';
    if (layout.useElkRenderer) {
      const elkConfig: any = {
        defaultRenderer: 'elk'
      };
      if (layout.mergeEdges !== undefined) {
        elkConfig.mergeEdges = layout.mergeEdges;
      }
      elkDirective = `%%{init: {"flowchart": ${JSON.stringify(elkConfig)}}}%%\n`;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
        <style>
          body {
            margin: 0;
            padding: ${layout.padding || 40}px;
            background: ${this.config.backgroundColor || 'white'};
            width: 100%;
          }
          #mermaid-diagram {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
          }
          .mermaid {
            width: 100%;
            max-width: 1400px;
          }
          .mermaid svg {
            max-width: 100%;
            height: auto;
          }
        </style>
      </head>
      <body>
        <div id="mermaid-diagram">
          <div class="mermaid">
            ${elkDirective}${mermaidContent}
          </div>
        </div>
        <script>
          mermaid.initialize(${JSON.stringify(mermaidConfig, null, 2)});
        </script>
      </body>
      </html>
    `;
  }
}