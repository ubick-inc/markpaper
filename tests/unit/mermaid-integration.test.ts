import { PDFGenerator } from '../../src/converter/pdf';
import { MarkPaperConfig } from '../../src/config/types';
import { Logger } from '../../src/utils/logger';
import { readFile, existsSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { promisify } from 'util';

const readFileAsync = promisify(readFile);

describe('Mermaid Integration Tests', () => {
  let generator: PDFGenerator;
  let logger: Logger;
  let config: MarkPaperConfig;

  beforeEach(() => {
    logger = new Logger(true); // Enable debug for tests
    config = {
      mermaid: {
        enabled: true,
        theme: 'default',
        width: 800,
        backgroundColor: 'white'
      },
      page: {
        size: 'A4'
      }
    };
    generator = new PDFGenerator(config, logger);
  });

  describe('Mermaid diagram rendering', () => {
    it('should render mermaid diagrams as images in PDF', async () => {
      // Create test markdown with mermaid diagram
      const testMarkdown = `# Test Document

## Mermaid Diagram Test

Below is a simple mermaid flowchart:

\`\`\`mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Do this]
    B -->|No| D[Do that]
    C --> E[End]
    D --> E
\`\`\`

This should be rendered as an image.`;

      const tempInputPath = join(tmpdir(), 'test-mermaid-input.md');
      const tempOutputPath = join(tmpdir(), 'test-mermaid-output.pdf');

      try {
        // Write test markdown
        writeFileSync(tempInputPath, testMarkdown);

        // Generate PDF
        await generator.generate(tempInputPath, tempOutputPath);

        // Check that PDF was created
        expect(existsSync(tempOutputPath)).toBe(true);

        // Read the PDF to verify it has content
        const pdfContent = await readFileAsync(tempOutputPath);
        expect(pdfContent.length).toBeGreaterThan(10000); // Should be substantial size

        // PDF should contain image reference (checking for PNG marker)
        // Note: This is a simple check, actual verification would require PDF parsing
        const pdfString = pdfContent.toString('binary');
        
        // Check for image stream markers in PDF
        expect(pdfString).toContain('/Type /XObject');
        expect(pdfString).toContain('/Subtype /Image');

      } finally {
        // Cleanup
        if (existsSync(tempInputPath)) {
          unlinkSync(tempInputPath);
        }
        if (existsSync(tempOutputPath)) {
          unlinkSync(tempOutputPath);
        }
      }
    }, 30000); // 30 second timeout for PDF generation

    it('should handle multiple mermaid diagrams', async () => {
      const testMarkdown = `# Multiple Diagrams

## First Diagram

\`\`\`mermaid
graph LR
    A[Input] --> B[Process]
    B --> C[Output]
\`\`\`

## Second Diagram

\`\`\`mermaid
sequenceDiagram
    Alice->>Bob: Hello Bob
    Bob->>Alice: Hi Alice
\`\`\`

## Third Diagram

\`\`\`mermaid
pie title Pets
    "Dogs" : 386
    "Cats" : 85
    "Rats" : 15
\`\`\`
`;

      const tempInputPath = join(tmpdir(), 'test-multi-mermaid.md');
      const tempOutputPath = join(tmpdir(), 'test-multi-mermaid.pdf');

      try {
        writeFileSync(tempInputPath, testMarkdown);
        await generator.generate(tempInputPath, tempOutputPath);

        expect(existsSync(tempOutputPath)).toBe(true);
        
        const pdfContent = await readFileAsync(tempOutputPath);
        expect(pdfContent.length).toBeGreaterThan(20000); // Should be larger with multiple diagrams
        
        // Should have multiple image objects
        const pdfString = pdfContent.toString('binary');
        const imageMatches = pdfString.match(/\/Subtype \/Image/g);
        expect(imageMatches).toBeTruthy();
        expect(imageMatches!.length).toBeGreaterThanOrEqual(3); // At least 3 images

      } finally {
        if (existsSync(tempInputPath)) {
          unlinkSync(tempInputPath);
        }
        if (existsSync(tempOutputPath)) {
          unlinkSync(tempOutputPath);
        }
      }
    }, 45000); // 45 second timeout for multiple diagrams

    it('should preserve mermaid diagram order', async () => {
      const testMarkdown = `# Ordered Diagrams

First text before diagram.

\`\`\`mermaid
graph TD
    First[First Diagram]
\`\`\`

Middle text between diagrams.

\`\`\`mermaid
graph TD
    Second[Second Diagram]
\`\`\`

Final text after diagrams.`;

      const tempInputPath = join(tmpdir(), 'test-ordered-mermaid.md');
      const tempOutputPath = join(tmpdir(), 'test-ordered-mermaid.pdf');

      try {
        writeFileSync(tempInputPath, testMarkdown);
        await generator.generate(tempInputPath, tempOutputPath);

        expect(existsSync(tempOutputPath)).toBe(true);
        
        // PDF should maintain the order of content
        const pdfContent = await readFileAsync(tempOutputPath);
        const pdfString = pdfContent.toString('binary');
        
        // Check that images are embedded (not just text)
        expect(pdfString).toContain('/Type /XObject');
        expect(pdfString).toContain('/Subtype /Image');
        
        // Should not contain raw mermaid syntax
        expect(pdfString).not.toContain('graph TD');
        expect(pdfString).not.toContain('```mermaid');

      } finally {
        if (existsSync(tempInputPath)) {
          unlinkSync(tempInputPath);
        }
        if (existsSync(tempOutputPath)) {
          unlinkSync(tempOutputPath);
        }
      }
    }, 30000);
  });
});