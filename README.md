# MarkPaper

<img width="512" height="512" alt="markpaper_logo_whiteback" src="https://github.com/user-attachments/assets/ddae1346-82c9-4b69-b991-c1e9fc1963aa" />

[![npm version](https://badge.fury.io/js/markpaper.svg)](https://badge.fury.io/js/markpaper)
[![Test](https://github.com/ubick-inc/markpaper/actions/workflows/test.yml/badge.svg)](https://github.com/ubick-inc/markpaper/actions/workflows/test.yml)
[![Publish](https://github.com/ubick-inc/markpaper/actions/workflows/publish.yml/badge.svg)](https://github.com/ubick-inc/markpaper/actions/workflows/publish.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/markpaper.svg)](https://nodejs.org)

Beautiful Markdown to PDF converter with automatic page breaks, Mermaid diagrams, and Japanese font support

## Concept

A tool that converts your everyday Markdown into beautiful PDFs that are familiar and appealing to paper-culture people with just one command.

## Features

- **Automatic Page Breaks**: Smart page breaks based on headings, ensuring text never breaks in the middle of a sentence
- **Beautiful Fonts**: Free font specification support including Japanese and multibyte characters
- **Mermaid Support**: Automatic conversion of Mermaid diagrams into beautiful graphics
- **Easy-to-use CLI**: One-command PDF generation with configuration file support

## Installation

### Global Installation (Recommended)

```bash
npm install -g markpaper
```

### Local Installation

```bash
npm install markpaper
```

### Using npx (without installation)

```bash
npx markpaper input.md
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
git clone https://github.com/ubick-inc/markpaper.git
cd markpaper
npm install
npm run dev
```

## License

MIT

## Contributing

PRs and Issues are welcome.
