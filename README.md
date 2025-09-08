# MarkPaper

<img width="1024" height="1024" alt="markpaper_logo_whiteback" src="https://github.com/user-attachments/assets/ddae1346-82c9-4b69-b991-c1e9fc1963aa" />

Beautiful Markdown to PDF converter

## Concept

A tool that converts your everyday Markdown into beautiful PDFs that are familiar and appealing to paper-culture people with just one command.

## Features

- **Automatic Page Breaks**: Smart page breaks based on headings, ensuring text never breaks in the middle of a sentence
- **Beautiful Fonts**: Free font specification support including Japanese and multibyte characters
- **Mermaid Support**: Automatic conversion of Mermaid diagrams into beautiful graphics
- **Easy-to-use CLI**: One-command PDF generation with configuration file support

## Installation

```bash
npm install -g markpaper
```

## Usage

### Basic Usage

```bash
markpaper input.md
# → Generates input.pdf
```

### With Options

```bash
markpaper input.md -o output.pdf --font "Noto Sans CJK JP"
```

### Using Configuration File

```bash
# Create markpaper.config.js or .markpaper.json
markpaper input.md --config markpaper.config.js
```

## Configuration

### Configuration File Example (markpaper.config.js)

```javascript
module.exports = {
  output: 'output.pdf',
  font: {
    main: 'Noto Sans CJK JP',
    mono: 'Source Code Pro'
  },
  pageBreak: {
    beforeH1: true,
    beforeH2: false
  },
  mermaid: {
    theme: 'default',
    width: 800
  }
}
```

## Technical Specifications

- **PDF Generation Engine**: Vivliostyle
- **Implementation Language**: TypeScript
- **Mermaid Rendering**: Puppeteer + mermaid.js
- **Font Support**: System fonts + embedded font support

## Development

```bash
git clone https://github.com/your-username/markpaper.git
cd markpaper
npm install
npm run dev
```

## License

MIT

## Contributing

PRs and Issues are welcome.
