# MarkPaper Development with Claude

This document contains context and guidelines for Claude to understand the MarkPaper project better.

## Project Overview

MarkPaper is a TypeScript-based Markdown to PDF conversion tool that focuses on:
- Beautiful typography and layout
- Intelligent page breaks
- Mermaid diagram support
- Japanese and multibyte font support
- Simple CLI interface

## Architecture

```
src/
├── cli.ts              # Command line interface entry point
├── index.ts            # Main library API
├── converter/
│   ├── markdown.ts     # Markdown parsing and preprocessing
│   ├── mermaid.ts      # Mermaid diagram processing
│   └── pdf.ts          # PDF generation with Vivliostyle
├── config/
│   ├── types.ts        # Configuration type definitions
│   └── loader.ts       # Configuration file loading
├── styles/
│   ├── base.css        # Base CSS for PDF layout
│   └── themes/         # Theme variations
└── utils/
    ├── fonts.ts        # Font handling utilities
    └── logger.ts       # Logging utilities
```

## Key Dependencies

- **@vivliostyle/cli**: Core PDF generation engine
- **marked**: Markdown parsing
- **mermaid**: Diagram generation
- **puppeteer**: Browser automation for diagram rendering
- **commander**: CLI framework
- **cosmiconfig**: Configuration file loading

## Development Standards

- Use TypeScript with strict mode
- Follow functional programming patterns where possible
- Prioritize readability and maintainability
- Add JSDoc comments for public APIs
- Use async/await for asynchronous operations
- Handle errors gracefully with meaningful messages

## Testing Strategy

- Unit tests for individual modules
- Integration tests for PDF generation pipeline
- CLI tests with sample markdown files
- Font and internationalization tests

## Build and Deployment

- TypeScript compilation to `dist/` directory
- Binary executable via `bin` field in package.json
- NPM package distribution
- Support for both global and local installation

## Performance Considerations

- Lazy loading of heavy dependencies (Puppeteer)
- Efficient CSS bundling and minification
- Memory management for large documents
- Parallel processing where applicable

## Known Challenges

- Font embedding and cross-platform compatibility
- Page break optimization algorithm
- Mermaid rendering consistency
- Large document memory usage
- Cross-platform binary distribution

## Future Enhancements

- Plugin system for custom processors
- Template system for different document types
- Web interface companion
- Docker containerization
- CI/CD pipeline with automated testing