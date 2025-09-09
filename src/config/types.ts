export interface FontConfig {
  /** Main font family for body text */
  main?: string;
  /** Monospace font family for code blocks */
  mono?: string;
  /** Heading font family */
  heading?: string;
  /** Font size in points */
  size?: number;
}

export interface PageBreakConfig {
  /** Insert page break before H1 headings */
  beforeH1?: boolean;
  /** Insert page break before H2 headings */
  beforeH2?: boolean;
  /** Insert page break before H3 headings */
  beforeH3?: boolean;
  /** Avoid page breaks within elements */
  avoidInside?: string[];
}

export interface MermaidConfig {
  /** Whether to enable Mermaid processing */
  enabled?: boolean;
  /** Mermaid theme */
  theme?: 'default' | 'dark' | 'forest' | 'neutral';
  /** Diagram width in pixels */
  width?: number;
  /** Background color */
  backgroundColor?: string;
  /** Scale factor */
  scale?: number;
}

export interface PageConfig {
  /** Page size */
  size?: 'A4' | 'A3' | 'Letter' | 'Legal';
  /** Page orientation */
  orientation?: 'portrait' | 'landscape';
  /** Page margins */
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
}

export interface MarkPaperConfig {
  /** Output file path */
  output?: string;
  /** Font configuration */
  font?: FontConfig;
  /** Page break configuration */
  pageBreak?: PageBreakConfig;
  /** Mermaid diagram configuration */
  mermaid?: MermaidConfig;
  /** Page configuration */
  page?: PageConfig;
  /** Custom CSS file path */
  css?: string;
  /** Theme name */
  theme?: string;
  /** Enable debug mode */
  debug?: boolean;
}

export interface CLIOptions extends MarkPaperConfig {
  /** Input markdown file */
  input: string;
  /** Configuration file path */
  config?: string;
}