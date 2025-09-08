import { marked } from 'marked';
import { MarkPaperConfig } from '../config/types';
import { Logger } from '../utils/logger';

export class MarkdownConverter {
  private config: MarkPaperConfig;
  private logger: Logger;

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
   * Extract mermaid diagrams from markdown
   */
  extractMermaidDiagrams(markdown: string): Array<{ id: string; content: string }> {
    const mermaidBlocks: Array<{ id: string; content: string }> = [];
    const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
    let match;
    let index = 0;

    while ((match = mermaidRegex.exec(markdown)) !== null) {
      mermaidBlocks.push({
        id: `mermaid-${index++}`,
        content: match[1].trim()
      });
    }

    this.logger.debugLog(`Found ${mermaidBlocks.length} mermaid diagrams`);
    return mermaidBlocks;
  }

  /**
   * Replace mermaid blocks with placeholder divs
   */
  replaceMermaidBlocks(html: string, diagrams: Array<{ id: string; imageUrl: string }>): string {
    let result = html;
    
    diagrams.forEach(({ id, imageUrl }) => {
      const placeholder = `<div class="mermaid-container avoid-page-break">
          <div class="mermaid">[Mermaid diagram ${id}]</div>
        </div>`;
      const replacement = `<div class="mermaid-container avoid-page-break">
          <img src="${imageUrl}" alt="Mermaid diagram ${id}" class="mermaid-image" />
        </div>`;
      result = result.replace(placeholder, replacement);
    });

    return result;
  }
}