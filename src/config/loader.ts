import { cosmiconfigSync } from 'cosmiconfig';
import { MarkPaperConfig, CLIOptions } from './types';

const defaultConfig: MarkPaperConfig = {
  font: {
    main: 'system-ui, -apple-system, sans-serif',
    mono: 'Menlo, Monaco, Consolas, monospace',
    heading: 'system-ui, -apple-system, sans-serif',
    size: 12
  },
  pageBreak: {
    beforeH1: true,
    beforeH2: false,
    beforeH3: false,
    avoidInside: ['pre', 'code', 'table']
  },
  mermaid: {
    theme: 'default',
    width: 800,
    backgroundColor: 'transparent',
    scale: 1
  },
  page: {
    size: 'A4',
    orientation: 'portrait',
    margin: {
      top: '2cm',
      right: '2cm',
      bottom: '2cm',
      left: '2cm'
    }
  },
  debug: false
};

/**
 * Load configuration from file or use defaults
 */
export function loadConfig(configPath?: string): MarkPaperConfig {
  const explorer = cosmiconfigSync('markpaper');
  
  let result;
  if (configPath) {
    result = explorer.load(configPath);
  } else {
    result = explorer.search();
  }

  const userConfig = result?.config || {};
  
  // Deep merge with defaults
  return mergeConfig(defaultConfig, userConfig);
}

/**
 * Merge CLI options with config file
 */
export function mergeOptions(config: MarkPaperConfig, options: Partial<CLIOptions>): MarkPaperConfig {
  return mergeConfig(config, options);
}

/**
 * Deep merge configuration objects
 */
function mergeConfig(base: MarkPaperConfig, override: Partial<MarkPaperConfig>): MarkPaperConfig {
  const result = { ...base };
  
  for (const key in override) {
    const value = override[key as keyof MarkPaperConfig];
    if (value !== undefined) {
      if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
        const baseValue = base[key as keyof MarkPaperConfig];
        if (typeof baseValue === 'object' && !Array.isArray(baseValue) && baseValue !== null) {
          // Deep merge nested objects
          result[key as keyof MarkPaperConfig] = mergeDeep(baseValue, value) as any;
        } else {
          result[key as keyof MarkPaperConfig] = value as any;
        }
      } else {
        result[key as keyof MarkPaperConfig] = value as any;
      }
    }
  }
  
  return result;
}

/**
 * Deep merge helper for nested objects
 */
function mergeDeep(target: any, source: any): any {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] !== undefined) {
      if (typeof source[key] === 'object' && !Array.isArray(source[key]) && source[key] !== null) {
        if (typeof target[key] === 'object' && !Array.isArray(target[key]) && target[key] !== null) {
          result[key] = mergeDeep(target[key], source[key]);
        } else {
          result[key] = source[key];
        }
      } else {
        result[key] = source[key];
      }
    }
  }
  
  return result;
}