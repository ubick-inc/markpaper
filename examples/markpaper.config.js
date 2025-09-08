module.exports = {
  // Output configuration
  output: 'sample-output.pdf',
  
  // Font configuration
  font: {
    main: 'Noto Sans CJK JP, system-ui, sans-serif',
    mono: 'Source Code Pro, Menlo, Monaco, Consolas, monospace',
    heading: 'Noto Sans CJK JP, system-ui, sans-serif',
    size: 11
  },
  
  // Page configuration
  page: {
    size: 'A4',
    orientation: 'portrait',
    margin: {
      top: '2.5cm',
      right: '2cm',
      bottom: '2cm',
      left: '2cm'
    }
  },
  
  // Page break configuration
  pageBreak: {
    beforeH1: true,
    beforeH2: false,
    beforeH3: false,
    avoidInside: ['pre', 'code', 'table', 'blockquote']
  },
  
  // Mermaid diagram configuration
  mermaid: {
    theme: 'default',
    width: 800,
    backgroundColor: 'white',
    scale: 1.0
  },
  
  // Debug mode
  debug: true
};