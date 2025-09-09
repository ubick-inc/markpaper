#!/usr/bin/env node

import { Command } from 'commander';
import { MarkPaper } from './index';
import { loadConfig, mergeOptions } from './config/loader';
import { CLIOptions } from './config/types';
import { Logger } from './utils/logger';
import { readFileSync } from 'fs';
import { join } from 'path';

// Read package.json for version
const packagePath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));

const program = new Command();

program
  .name('markpaper')
  .description('Beautiful Markdown to PDF converter')
  .version(packageJson.version);

program
  .argument('<input>', 'Input markdown file')
  .option('-o, --output <path>', 'Output PDF file path')
  .option('-c, --config <path>', 'Configuration file path')
  .option('--font-main <font>', 'Main font family')
  .option('--font-mono <font>', 'Monospace font family')
  .option('--font-heading <font>', 'Heading font family')
  .option('--font-size <size>', 'Font size in points', parseFloat)
  .option('--page-size <size>', 'Page size (A4, A3, Letter, Legal)', 'A4')
  .option('--page-orientation <orientation>', 'Page orientation (portrait, landscape)', 'portrait')
  .option('--margin-top <margin>', 'Top margin (e.g., 2cm, 1in)')
  .option('--margin-right <margin>', 'Right margin (e.g., 2cm, 1in)')
  .option('--margin-bottom <margin>', 'Bottom margin (e.g., 2cm, 1in)')
  .option('--margin-left <margin>', 'Left margin (e.g., 2cm, 1in)')
  .option('--page-break-h1', 'Insert page break before H1 headings')
  .option('--page-break-h2', 'Insert page break before H2 headings')
  .option('--page-break-h3', 'Insert page break before H3 headings')
  .option('--mermaid-theme <theme>', 'Mermaid theme (default, dark, forest, neutral)', 'default')
  .option('--mermaid-width <width>', 'Mermaid diagram width in pixels', parseInt)
  .option('--mermaid-background <color>', 'Mermaid background color')
  .option('--mermaid-node-spacing <spacing>', 'Minimum spacing between nodes in pixels', parseInt)
  .option('--mermaid-rank-spacing <spacing>', 'Spacing between different levels/ranks in pixels', parseInt)
  .option('--mermaid-curve-style <style>', 'Curve style for connections (cardinal, linear, basis, etc.)')
  .option('--mermaid-padding <padding>', 'Padding around the diagram in pixels', parseInt)
  .option('--mermaid-elk-renderer', 'Use ELK renderer for better layout optimization')
  .option('--mermaid-merge-edges', 'Merge parallel edges to reduce clutter')
  .option('--no-mermaid', 'Skip Mermaid diagram processing')
  .option('--css <path>', 'Custom CSS file path')
  .option('--theme <name>', 'Theme name')
  .option('--debug', 'Enable debug mode')
  .action(async (input: string, options) => {
    const logger = new Logger(options.debug);
    
    try {
      logger.info('MarkPaper - Beautiful Markdown to PDF converter');
      
      // Load base configuration
      const config = loadConfig(options.config);
      
      // Build CLI options
      const cliOptions: Partial<CLIOptions> = {
        input,
        output: options.output,
        debug: options.debug
      };

      // Font options
      if (options.fontMain || options.fontMono || options.fontHeading || options.fontSize) {
        cliOptions.font = {
          ...(config.font || {}),
          ...(options.fontMain && { main: options.fontMain }),
          ...(options.fontMono && { mono: options.fontMono }),
          ...(options.fontHeading && { heading: options.fontHeading }),
          ...(options.fontSize && { size: options.fontSize })
        };
      }

      // Page options
      if (options.pageSize || options.pageOrientation || 
          options.marginTop || options.marginRight || options.marginBottom || options.marginLeft) {
        cliOptions.page = {
          ...(config.page || {}),
          ...(options.pageSize && { size: options.pageSize }),
          ...(options.pageOrientation && { orientation: options.pageOrientation })
        };

        if (options.marginTop || options.marginRight || options.marginBottom || options.marginLeft) {
          if (!cliOptions.page) {
            cliOptions.page = { ...(config.page || {}) };
          }
          cliOptions.page.margin = {
            ...(config.page?.margin || {}),
            ...(options.marginTop && { top: options.marginTop }),
            ...(options.marginRight && { right: options.marginRight }),
            ...(options.marginBottom && { bottom: options.marginBottom }),
            ...(options.marginLeft && { left: options.marginLeft })
          };
        }
      }

      // Page break options
      if (options.pageBreakH1 || options.pageBreakH2 || options.pageBreakH3) {
        cliOptions.pageBreak = {
          ...(config.pageBreak || {}),
          ...(options.pageBreakH1 && { beforeH1: true }),
          ...(options.pageBreakH2 && { beforeH2: true }),
          ...(options.pageBreakH3 && { beforeH3: true })
        };
      }

      // Mermaid options
      if (options.mermaid === false) {
        // If --no-mermaid is used, disable mermaid processing
        cliOptions.mermaid = {
          ...(config.mermaid || {}),
          enabled: false
        };
      } else if (options.mermaidTheme || options.mermaidWidth || options.mermaidBackground ||
                 options.mermaidNodeSpacing || options.mermaidRankSpacing || options.mermaidCurveStyle ||
                 options.mermaidPadding || options.mermaidElkRenderer || options.mermaidMergeEdges) {
        
        // Build layout configuration
        const layoutConfig: any = {};
        if (options.mermaidNodeSpacing) layoutConfig.nodeSpacing = options.mermaidNodeSpacing;
        if (options.mermaidRankSpacing) layoutConfig.rankSpacing = options.mermaidRankSpacing;
        if (options.mermaidCurveStyle) layoutConfig.curveStyle = options.mermaidCurveStyle;
        if (options.mermaidPadding) layoutConfig.padding = options.mermaidPadding;
        if (options.mermaidElkRenderer) layoutConfig.useElkRenderer = true;
        if (options.mermaidMergeEdges) layoutConfig.mergeEdges = true;

        cliOptions.mermaid = {
          ...(config.mermaid || {}),
          enabled: true,
          ...(options.mermaidTheme && { theme: options.mermaidTheme }),
          ...(options.mermaidWidth && { width: options.mermaidWidth }),
          ...(options.mermaidBackground && { backgroundColor: options.mermaidBackground }),
          ...(Object.keys(layoutConfig).length > 0 && { 
            layout: { 
              ...(config.mermaid?.layout || {}), 
              ...layoutConfig 
            } 
          })
        };
      }

      // Other options
      if (options.css) {
        cliOptions.css = options.css;
      }
      if (options.theme) {
        cliOptions.theme = options.theme;
      }

      // Merge configurations
      const finalConfig = mergeOptions(config, cliOptions);

      // Create MarkPaper instance and convert
      const markPaper = new MarkPaper(finalConfig);
      await markPaper.convert(input, options.output);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Conversion failed: ${errorMessage}`);
      process.exit(1);
    }
  });

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

program.parse();