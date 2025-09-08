import { MarkdownConverter } from '../../../src/converter/markdown';
import { MarkPaperConfig } from '../../../src/config/types';
import { Logger } from '../../../src/utils/logger';

describe('MarkdownConverter', () => {
  let converter: MarkdownConverter;
  let mockLogger: Logger;
  let config: MarkPaperConfig;

  beforeEach(() => {
    mockLogger = new Logger(false);
    jest.spyOn(mockLogger, 'debugLog').mockImplementation();
    jest.spyOn(mockLogger, 'error').mockImplementation();
    
    config = {
      pageBreak: {
        beforeH1: true,
        beforeH2: false,
        beforeH3: false,
        avoidInside: ['pre', 'code', 'table']
      }
    };
    
    converter = new MarkdownConverter(config, mockLogger);
  });

  describe('convert', () => {
    it('should convert basic markdown to HTML', async () => {
      const markdown = '# Heading\n\nParagraph text.';
      const html = await converter.convert(markdown);
      
      expect(html).toContain('<h1');
      expect(html).toContain('Heading</h1>');
      expect(html).toContain('<p>Paragraph text.</p>');
    });

    it('should handle code blocks', async () => {
      const markdown = '```javascript\nconst x = 1;\n```';
      const html = await converter.convert(markdown);
      
      expect(html).toContain('class="code-block avoid-page-break"');
      expect(html).toContain('const x = 1;');
    });

    it('should handle tables', async () => {
      const markdown = '| Col1 | Col2 |\n|------|------|\n| A    | B    |';
      const html = await converter.convert(markdown);
      
      expect(html).toContain('class="table-container avoid-page-break"');
      expect(html).toContain('<table>');
      expect(html).toContain('<thead>');
      expect(html).toContain('<tbody>');
    });

    it('should add page break classes to headings when configured', async () => {
      const markdown = '# H1\n## H2\n### H3';
      const html = await converter.convert(markdown);
      
      // H1 should have page-break-before class
      expect(html).toContain('class="page-break-before"');
      expect(html).toMatch(/<h1[^>]*class="page-break-before"/);
      
      // H2 and H3 should not have the class
      expect(html).not.toMatch(/<h2[^>]*class="page-break-before"/);
      expect(html).not.toMatch(/<h3[^>]*class="page-break-before"/);
    });

    it('should handle inline code', async () => {
      const markdown = 'Use `console.log()` to debug.';
      const html = await converter.convert(markdown);
      
      expect(html).toContain('<code>console.log()</code>');
    });

    it('should handle lists', async () => {
      const markdown = '- Item 1\n- Item 2\n\n1. First\n2. Second';
      const html = await converter.convert(markdown);
      
      expect(html).toContain('<ul>');
      expect(html).toContain('<ol>');
      expect(html).toContain('<li>Item 1</li>');
      expect(html).toContain('<li>First</li>');
    });

    it('should handle blockquotes', async () => {
      const markdown = '> This is a quote';
      const html = await converter.convert(markdown);
      
      expect(html).toContain('<blockquote>');
      expect(html).toContain('This is a quote');
    });

    it('should handle links', async () => {
      const markdown = '[Link text](https://example.com)';
      const html = await converter.convert(markdown);
      
      expect(html).toContain('<a href="https://example.com">Link text</a>');
    });

    it('should handle images', async () => {
      const markdown = '![Alt text](image.png)';
      const html = await converter.convert(markdown);
      
      expect(html).toContain('<img src="image.png" alt="Alt text">');
    });

    it('should handle bold and italic text', async () => {
      const markdown = '**bold** and *italic* text';
      const html = await converter.convert(markdown);
      
      expect(html).toContain('<strong>bold</strong>');
      expect(html).toContain('<em>italic</em>');
    });
  });

  describe('extractMermaidDiagrams', () => {
    it('should extract mermaid code blocks', () => {
      const markdown = `
# Document

\`\`\`mermaid
graph TD
    A --> B
\`\`\`

Some text

\`\`\`mermaid
sequenceDiagram
    A->>B: Hello
\`\`\`
      `;
      
      const diagrams = converter.extractMermaidDiagrams(markdown);
      
      expect(diagrams).toHaveLength(2);
      expect(diagrams[0]).toEqual({
        id: 'mermaid-0',
        content: 'graph TD\n    A --> B'
      });
      expect(diagrams[1]).toEqual({
        id: 'mermaid-1',
        content: 'sequenceDiagram\n    A->>B: Hello'
      });
    });

    it('should return empty array when no mermaid blocks', () => {
      const markdown = '# Document\n\nNo diagrams here.';
      const diagrams = converter.extractMermaidDiagrams(markdown);
      
      expect(diagrams).toEqual([]);
    });

    it('should handle mermaid blocks with complex content', () => {
      const markdown = `
\`\`\`mermaid
graph LR
    A[Square Rect] -- Link text --> B((Circle))
    A --> C(Round Rect)
    B --> D{Rhombus}
    C --> D
\`\`\`
      `;
      
      const diagrams = converter.extractMermaidDiagrams(markdown);
      
      expect(diagrams).toHaveLength(1);
      expect(diagrams[0].content).toContain('A[Square Rect]');
      expect(diagrams[0].content).toContain('D{Rhombus}');
    });
  });

  describe('replaceMermaidBlocks', () => {
    it('should replace mermaid placeholders with images', () => {
      const html = `
        <div class="mermaid-container avoid-page-break">
          <div class="mermaid">[Mermaid diagram mermaid-0]</div>
        </div>
      `;
      
      const diagrams = [
        { id: 'mermaid-0', imageUrl: '/path/to/image.png' }
      ];
      
      const result = converter.replaceMermaidBlocks(html, diagrams);
      
      expect(result).toContain('<img src="/path/to/image.png"');
      expect(result).toContain('alt="Mermaid diagram mermaid-0"');
      expect(result).not.toContain('[Mermaid diagram mermaid-0]');
    });

    it('should handle multiple diagrams', () => {
      const html = `
        <div class="mermaid-container avoid-page-break">
          <div class="mermaid">[Mermaid diagram mermaid-0]</div>
        </div>
        <p>Text</p>
        <div class="mermaid-container avoid-page-break">
          <div class="mermaid">[Mermaid diagram mermaid-1]</div>
        </div>
      `;
      
      const diagrams = [
        { id: 'mermaid-0', imageUrl: '/path/to/image1.png' },
        { id: 'mermaid-1', imageUrl: '/path/to/image2.png' }
      ];
      
      const result = converter.replaceMermaidBlocks(html, diagrams);
      
      expect(result).toContain('src="/path/to/image1.png"');
      expect(result).toContain('src="/path/to/image2.png"');
    });
  });
});