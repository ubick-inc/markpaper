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

      // H2見出しは常に改ページを強制
      if (level === 1 && (this.config.pageBreak?.beforeH1 !== false)) {
        pageBreakClass = ' class="page-break-before"';
      } else if (level === 2) {
        // H2は設定に関係なく常に改ページ
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
      // Reset headings for new conversion
      this.headings = [];

      let html = marked(markdown);

      // Generate table of contents and insert after first H1
      if (this.headings.length > 0) {
        const toc = this.generateTableOfContents();
        if (toc.trim()) { // Only insert if TOC has content
          html = this.insertTOCAfterFirstH1(html, toc);
        }
      }

      // Wrap sections to prevent page breaks within chapters
      html = this.wrapSectionsForPageBreaks(html);

      // Clean up empty elements that might cause visual artifacts
      html = this.cleanupEmptyElements(html);

      this.logger.debugLog('Markdown conversion completed');
      return html;
    } catch (error) {
      this.logger.error(`Failed to convert markdown: ${error}`);
      throw error;
    }
  }

  /**
   * Wrap content between headings in section divs to control page breaks
   */
  private wrapSectionsForPageBreaks(html: string): string {
    // Split content by headings while preserving the heading tags
    const sections: string[] = [];
    const headingRegex = /(<h[1-6][^>]*>.*?<\/h[1-6]>)/gi;
    const parts = html.split(headingRegex);

    let currentSection = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const headingMatch = part.match(/<h([1-6])[^>]*>/i);

      if (headingMatch) {
        // Close previous section if exists and contains content
        if (currentSection.trim()) {
          sections.push(`<div class="section-content avoid-page-break">${currentSection.trim()}</div>`);
        }

        // Start new section with heading
        currentSection = part;
      } else if (part.trim()) {
        // Only add non-empty content
        currentSection += part;
      }
    }

    // Close final section
    if (currentSection.trim()) {
      sections.push(`<div class="section-content avoid-page-break">${currentSection.trim()}</div>`);
    }

    return sections.filter(section => section.trim()).join('\n\n');
  }

  /**
   * Insert TOC after first H1, with precise content placement
   */
  private insertTOCAfterFirstH1(html: string, toc: string): string {
    // H1タグの直後に目次を挿入し、余分な要素を避ける
    const h1Pattern = /(<h1[^>]*>.*?<\/h1>)\s*(<p>.*?<\/p>)?\s*(<h2[^>]*>)/is;
    const h1Match = html.match(h1Pattern);

    if (h1Match) {
      const h1Tag = h1Match[1];
      const firstParagraph = h1Match[2] || '';
      const h2Tag = h1Match[3];

      // H1の直後、最初のH2の前に目次を挿入（最初の段落は保持）
      const afterToc = html.substring(html.indexOf(h2Tag));

      if (firstParagraph) {
        // H1 + 段落 + TOC + H2以降
        return h1Tag + '\n\n' + firstParagraph + '\n\n' + toc + '\n\n' + afterToc;
      } else {
        // H1 + TOC + H2以降
        return h1Tag + '\n\n' + toc + '\n\n' + afterToc;
      }
    }

    // フォールバック: 単純なH1後挿入
    const simpleH1Pattern = /(<h1[^>]*>.*?<\/h1>)/i;
    const simpleMatch = html.match(simpleH1Pattern);
    if (simpleMatch) {
      const h1End = html.indexOf(simpleMatch[1]) + simpleMatch[1].length;
      return html.slice(0, h1End) + '\n\n' + toc + '\n\n' + html.slice(h1End);
    }

    return toc + '\n\n' + html;
  }

  /**
   * Generate table of contents HTML with proper hierarchical structure
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
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
          '&': '&amp;'
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
   * Clean up empty HTML elements that might cause visual artifacts
   */
  private cleanupEmptyElements(html: string): string {
    // Remove empty divs, paragraphs, and other containers
    html = html.replace(/<div[^>]*>\s*<\/div>/gi, '');
    html = html.replace(/<p[^>]*>\s*<\/p>/gi, '');
    html = html.replace(/<blockquote[^>]*>\s*<\/blockquote>/gi, '');
    html = html.replace(/<ul[^>]*>\s*<\/ul>/gi, '');
    html = html.replace(/<ol[^>]*>\s*<\/ol>/gi, '');
    html = html.replace(/<pre[^>]*>\s*<\/pre>/gi, '');
    html = html.replace(/<code[^>]*>\s*<\/code>/gi, '');

    // Remove multiple consecutive whitespace/newlines
    html = html.replace(/\n\s*\n\s*\n/g, '\n\n');

    // Remove empty table-of-contents divs specifically
    html = html.replace(/<div class="table-of-contents"[^>]*>\s*<h2>目次<\/h2>\s*<ul class="toc-list">\s*<\/ul>\s*<\/div>/gi, '');

    return html.trim();
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
}
