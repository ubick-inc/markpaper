import { marked } from 'marked';
import { MarkPaperConfig } from '../config/types';
import { Logger } from '../utils/logger';

export class MarkdownConverter {
  private config: MarkPaperConfig;
  private logger: Logger;
  private mermaidCounter: number = 0;

  constructor(config: MarkPaperConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.setupMarked();
  }

  /**
   * Configure marked renderer
   */
  private setupMarked(): void {
    const renderer = new marked.Renderer();

    // Add page break classes to headings
    renderer.heading = (text: string, level: number, raw: string) => {
      const escapedText = raw.toLowerCase().replace(/[^\w]+/g, '-');
      let pageBreakClass = '';
      
      if (level === 1 && this.config.pageBreak?.beforeH1) {
        pageBreakClass = ' class="page-break-before"';
      } else if (level === 2 && this.config.pageBreak?.beforeH2) {
        pageBreakClass = ' class="page-break-before"';
      } else if (level === 3 && this.config.pageBreak?.beforeH3) {
        pageBreakClass = ' class="page-break-before"';
      }

      return `<h${level}${pageBreakClass} id="${escapedText}">${text}</h${level}>`;
    };

    // Wrap code blocks with avoid-page-break class
    renderer.code = (code, language) => {
      const validLanguage = language && /^[a-zA-Z0-9_+-]*$/.test(language);
      const langClass = validLanguage ? ` language-${language}` : '';
      return `<div class="code-block avoid-page-break"><pre><code class="hljs${langClass}">${code}</code></pre></div>`;
    };

    // Wrap tables with avoid-page-break class
    renderer.table = (header, body) => {
      return `<div class="table-container avoid-page-break">
        <table>
          <thead>${header}</thead>
          <tbody>${body}</tbody>
        </table>
      </div>`;
    };

    // Handle mermaid code blocks specially
    const originalCodeRenderer = renderer.code;
    renderer.code = (code: string, language?: string) => {
      if (language === 'mermaid') {
        return `<div class="mermaid-container avoid-page-break">
          <div class="mermaid">${code}</div>
        </div>`;
      }
      
      const validLanguage = language && /^[a-zA-Z0-9_+-]*$/.test(language);
      const langClass = validLanguage ? ` language-${language}` : '';
      return `<div class="code-block avoid-page-break"><pre><code class="hljs${langClass}">${code}</code></pre></div>`;
    };

    marked.setOptions({
      renderer,
      gfm: true,
      breaks: false
    });
  }

  /**
   * Convert markdown to HTML
   */
  async convert(markdown: string): Promise<string> {
    this.logger.debugLog('Converting markdown to HTML');
    
    try {
      const html = marked(markdown);
      this.logger.debugLog('Markdown conversion completed');
      return html;
    } catch (error) {
      this.logger.error(`Failed to convert markdown: ${error}`);
      throw error;
    }
  }

  /**
   * Extract title from mermaid diagram content
   */
  private extractMermaidTitle(content: string): string | null {
    // Try to extract title from various formats
    const titlePatterns = [
      /title\s*:\s*"([^"]+)"/,      // title: "Title"
      /title\s*:\s*'([^']+)'/,      // title: 'Title'
      /title\s*:\s*([^\n]+)/,       // title: Title
      /title\s*\[\s*"([^"]+)"\s*\]/, // title["Title"]
      /title\s*\[\s*'([^']+)'\s*\]/, // title['Title']
      /title\s*\[\s*([^\]]+)\s*\]/,  // title[Title]
      /%%{.*title:\s*"([^"]+)".*}%%/, // %%{config: { title: "Title" }}%%
      /%%{.*title:\s*'([^']+)'.*}%%/  // %%{config: { title: 'Title' }}%%
    ];

    for (const pattern of titlePatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Generate caption for mermaid diagram
   */
  private generateMermaidCaption(title: string | null, number: number): string {
    const captionConfig = this.config.mermaid?.captions;
    if (!captionConfig?.enabled) {
      return '';
    }

    const prefix = captionConfig.prefix || '図';
    const format = captionConfig.format || '{prefix} {number}: {title}';
    const displayTitle = title || '';

    // Replace placeholders in format
    let caption = format
      .replace('{prefix}', prefix)
      .replace('{number}', number.toString())
      .replace('{title}', displayTitle);

    // Remove trailing colon and space if no title
    if (!displayTitle && caption.endsWith(': ')) {
      caption = caption.slice(0, -2);
    }

    return caption;
  }

  /**
   * Extract mermaid diagrams from markdown
   */
  extractMermaidDiagrams(markdown: string): Array<{ id: string; content: string; title?: string; caption?: string }> {
    const mermaidBlocks: Array<{ id: string; content: string; title?: string; caption?: string }> = [];
    const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
    let match;
    let index = 0;

    // Reset counter for new document
    this.mermaidCounter = 0;

    while ((match = mermaidRegex.exec(markdown)) !== null) {
      const content = match[1].trim();
      const captionConfig = this.config.mermaid?.captions;
      let title: string | undefined;
      let caption: string | undefined;

      if (captionConfig?.enabled) {
        if (captionConfig.extractTitle) {
          title = this.extractMermaidTitle(content) || undefined;
        }

        if (captionConfig.autoNumber) {
          this.mermaidCounter++;
          caption = this.generateMermaidCaption(title || null, this.mermaidCounter);
        }
      }

      mermaidBlocks.push({
        id: `mermaid-${index++}`,
        content,
        title,
        caption
      });
    }

    this.logger.debugLog(`Found ${mermaidBlocks.length} mermaid diagrams`);
    return mermaidBlocks;
  }

  /**
   * Replace mermaid blocks with placeholder divs
   */
  replaceMermaidBlocks(html: string, diagrams: Array<{ id: string; imageUrl: string; caption?: string }>): string {
    let result = html;
    
    // Extract all mermaid blocks from the HTML
    const mermaidRegex = /<div class="mermaid-container avoid-page-break">\s*<div class="mermaid">([\s\S]*?)<\/div>\s*<\/div>/g;
    let match;
    let index = 0;
    
    // Replace each mermaid block with corresponding image
    result = result.replace(mermaidRegex, (fullMatch, mermaidContent) => {
      if (index < diagrams.length) {
        const diagram = diagrams[index];
        index++;
        
        let captionHtml = '';
        if (diagram.caption) {
          captionHtml = `<div class="mermaid-caption">${diagram.caption}</div>`;
        }
        
        return `<div class="mermaid-container avoid-page-break">
          <img src="${diagram.imageUrl}" alt="Mermaid diagram ${diagram.id}" class="mermaid-image" />
          ${captionHtml}
        </div>`;
      }
      return fullMatch; // Return original if no diagram available
    });

    return result;
  }
}