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
    // Get the effective theme (defaulting to 'base' for modern styling)
    const theme = this.config.theme || 'base';
    
    // Create modern theme variables if using base theme and no custom variables provided
    const defaultModernThemeVariables = theme === 'base' && !this.config.themeVariables ? {
      // Modern professional color palette
      primaryColor: '#f8fafc',
      primaryTextColor: '#1e293b',
      primaryBorderColor: '#3b82f6',
      
      secondaryColor: '#e0f2fe', 
      secondaryTextColor: '#0f172a',
      secondaryBorderColor: '#0ea5e9',
      
      tertiaryColor: '#fef3c7',
      tertiaryTextColor: '#92400e',
      tertiaryBorderColor: '#f59e0b',
      
      // Clean background and improved contrast
      background: '#ffffff',
      lineColor: '#64748b',
      
      // Enhanced node styling
      mainBkg: '#ffffff',
      secondBkg: '#f1f5f9', 
      tertiaryBkg: '#e2e8f0',
      
      // Modern typography
      fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '14px',
      
      // Improved diagram elements
      nodeTextColor: '#1e293b',
      nodeBorder: '#3b82f6',
      clusterBkg: '#f8fafc',
      clusterBorder: '#e2e8f0',
      
      // Sequence diagram enhancements
      actorBkg: '#ffffff',
      actorBorder: '#3b82f6', 
      actorTextColor: '#1e293b',
      activationBkg: '#dbeafe',
      activationBorderColor: '#3b82f6',
      
      // State diagram improvements
      labelBoxBkgColor: '#f8fafc',
      labelBoxBorderColor: '#e2e8f0',
      labelTextColor: '#1e293b',
      
      // Enhanced git diagram colors  
      git0: '#3b82f6',
      git1: '#10b981',
      git2: '#f59e0b', 
      git3: '#ef4444',
      git4: '#8b5cf6',
      git5: '#06b6d4',
      git6: '#84cc16',
      git7: '#f97316'
    } : this.config.themeVariables;

    // Build mermaid configuration
    const mermaidConfig: any = {
      theme,
      startOnLoad: true,
      securityLevel: 'loose'
    };
    
    // Add theme variables if provided
    if (defaultModernThemeVariables) {
      mermaidConfig.themeVariables = defaultModernThemeVariables;
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
            padding: 40px;
            background: ${this.config.backgroundColor || 'white'};
            width: 100%;
            font-family: ${defaultModernThemeVariables?.fontFamily || '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'};
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
            ${mermaidContent}
          </div>
        </div>
        <script>
          mermaid.initialize(${JSON.stringify(mermaidConfig)});
        </script>
      </body>
      </html>
    `;
  }
}