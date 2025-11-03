import { marked } from 'marked';
import { MarkPaperConfig } from '../config/types';
import { Logger } from '../utils/logger';
import { fetchImageAsBase64, parseImageSize, generateImageStyle } from '../utils/image';

export class MarkdownConverter {
  private config: MarkPaperConfig;
  private logger: Logger;
  private headings: Array<{ level: number; text: string; id: string }> = [];

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

    // Add page break classes to headings and collect for TOC
    renderer.heading = (text: string, level: number, raw: string) => {
      const escapedText = raw.toLowerCase().replace(/[^\w]+/g, '-');
      let pageBreakClass = '';

      // 目次用に見出し情報を保存
      this.headings.push({ level, text, id: escapedText });

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
      // Reset headings for each conversion
      this.headings = [];

      let html = marked(markdown);

      // Generate and insert table of contents if there are multiple sections
      if (this.headings.length > 0) {
        const toc = this.generateTableOfContents();
        if (toc.trim()) {
          html = this.insertTOCAfterFirstH1(html, toc);
        }
      }

      // Clean up empty elements
      html = this.cleanupEmptyElements(html);

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
   * Replace mermaid blocks with rendered images
   */
  replaceMermaidBlocks(html: string, diagrams: Array<{ id: string; imageUrl: string; content: string }>): string {
    let result = html;

    diagrams.forEach(({ id, imageUrl, content }) => {
      // Match the actual mermaid code block in HTML
      // The mermaid code renderer outputs: <div class="mermaid-container..."><div class="mermaid">{code}</div></div>
      const escapedContent = content.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(
        `<div class="mermaid-container avoid-page-break">\\s*<div class="mermaid">${escapedContent}</div>\\s*</div>`,
        'g'
      );
      const replacement = `<div class="mermaid-container avoid-page-break">
          <img src="${imageUrl}" alt="Mermaid diagram ${id}" class="mermaid-image" />
        </div>`;
      result = result.replace(pattern, replacement);
    });

    return result;
  }

  /**
   * Process images: convert to base64 and apply size specifications
   */
  async processImages(html: string, baseDir?: string): Promise<string> {
    // Match all img tags with any attributes
    const imgRegex = /<img\s+[^>]*?src="([^"]+)"[^>]*?>/gi;
    const matches = Array.from(html.matchAll(imgRegex));

    if (matches.length === 0) {
      return html;
    }

    this.logger.debugLog(`Processing ${matches.length} images`);
    let result = html;

    // Process each image
    for (const match of matches) {
      const fullMatch = match[0];
      let src = match[1];

      try {
        // Skip if already a data URI
        if (src.startsWith('data:')) {
          continue;
        }

        // Resolve relative paths based on baseDir (input markdown file directory)
        if (baseDir && !src.startsWith('http://') && !src.startsWith('https://')) {
          const path = require('path');
          src = path.resolve(baseDir, src);
          this.logger.debugLog(`Resolved relative path: ${match[1]} -> ${src}`);
        }

        // Extract all attributes from the img tag
        const attributes: Record<string, string> = {};
        const attrRegex = /(\w+)="([^"]*)"/g;
        let attrMatch;

        while ((attrMatch = attrRegex.exec(fullMatch)) !== null) {
          const [, attrName, attrValue] = attrMatch;
          if (attrName !== 'src') {  // Don't include src yet
            attributes[attrName] = attrValue;
          }
        }

        // Extract and parse alt text for size specification
        const altText = attributes.alt || '';
        const { alt: cleanAlt, size } = parseImageSize(altText);

        // Fetch and convert image to base64
        this.logger.debugLog(`Fetching image: ${src}`);
        const base64Src = await fetchImageAsBase64(src);

        // Build new img tag with proper spacing and attributes
        let newImgTag = '<img';
        newImgTag += ` src="${base64Src}"`;
        newImgTag += ` alt="${cleanAlt}"`;

        // Add other attributes except alt
        for (const [key, value] of Object.entries(attributes)) {
          if (key !== 'alt') {
            newImgTag += ` ${key}="${value}"`;
          }
        }

        // Add style for size if specified
        if (size) {
          const styles: string[] = [];
          if (size.width) styles.push(`width: ${size.width}px`);
          if (size.height) styles.push(`height: ${size.height}px`);

          if (styles.length > 0) {
            // Merge with existing style attribute if present
            const existingStyle = attributes.style || '';
            const combinedStyle = existingStyle
              ? `${existingStyle}; ${styles.join('; ')}`
              : styles.join('; ');
            newImgTag = newImgTag.replace(/ style="[^"]*"/, '');  // Remove existing style
            newImgTag += ` style="${combinedStyle}"`;
          }
        }

        newImgTag += '>';

        // Replace in result
        result = result.replace(fullMatch, newImgTag);

        this.logger.debugLog(`Successfully processed image: ${src}`);
      } catch (error) {
        this.logger.warn(`Failed to process image ${src}: ${error}`);
        // Keep original img tag on error
      }
    }

    return result;
  }

  /**
   * Generate table of contents from collected headings
   */
  private generateTableOfContents(): string {
    // H1以外の見出しを階層構造で生成
    const filteredHeadings = this.headings.filter(h => h.level > 1 && h.text.trim());

    if (filteredHeadings.length === 0) {
      return '';
    }

    // Generate clean TOC items with proper escaping
    const tocItems = filteredHeadings.map(heading => {
      const levelClass = `toc-level-${heading.level}`;
      const cleanText = heading.text.replace(/[<>"'&]/g, (match) => {
        const entities: Record<string, string> = {
          '<': '&lt;', '>': '&gt;', '"': '&quot;',
          "'": '&#39;', '&': '&amp;'
        };
        return entities[match] || match;
      });
      const cleanId = heading.id.replace(/[^a-zA-Z0-9_-]/g, '');
      return `<li class="${levelClass}"><a href="#${cleanId}">${cleanText}</a></li>`;
    }).join('\n    ');

    return `<div class="table-of-contents">
  <h2>目次</h2>
  <ul class="toc-list">
    ${tocItems}
  </ul>
</div>`;
  }

  /**
   * Insert TOC after the first H1 heading
   */
  private insertTOCAfterFirstH1(html: string, toc: string): string {
    // Find the first H1 heading
    const h1Match = html.match(/<h1[^>]*>.*?<\/h1>/);

    if (!h1Match) {
      // No H1 found, prepend TOC to the beginning
      return toc + '\n' + html;
    }

    const h1EndIndex = html.indexOf(h1Match[0]) + h1Match[0].length;
    return html.slice(0, h1EndIndex) + '\n' + toc + '\n' + html.slice(h1EndIndex);
  }

  /**
   * Clean up empty HTML elements
   */
  private cleanupEmptyElements(html: string): string {
    // Remove empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '');

    // Remove empty divs
    html = html.replace(/<div[^>]*>\s*<\/div>/g, '');

    // Remove multiple consecutive newlines
    html = html.replace(/\n{3,}/g, '\n\n');

    return html.trim();
  }
}