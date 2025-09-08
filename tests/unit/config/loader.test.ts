import { loadConfig, mergeOptions } from '../../../src/config/loader';
import { MarkPaperConfig } from '../../../src/config/types';
import { cosmiconfigSync } from 'cosmiconfig';

// Mock cosmiconfig
jest.mock('cosmiconfig', () => ({
  cosmiconfigSync: jest.fn()
}));

describe('Config Loader', () => {
  const mockExplorer = {
    search: jest.fn(),
    load: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (cosmiconfigSync as jest.Mock).mockReturnValue(mockExplorer);
  });

  describe('loadConfig', () => {
    it('should return default config when no config file found', () => {
      mockExplorer.search.mockReturnValue(null);
      
      const config = loadConfig();
      
      expect(config).toHaveProperty('font');
      expect(config.font?.main).toContain('system-ui');
      expect(config.pageBreak?.beforeH1).toBe(true);
      expect(config.pageBreak?.beforeH2).toBe(false);
      expect(config.page?.size).toBe('A4');
    });

    it('should load config from specified path', () => {
      const customConfig = {
        font: { main: 'Custom Font' },
        debug: true
      };
      
      mockExplorer.load.mockReturnValue({ config: customConfig });
      
      const config = loadConfig('/path/to/config.js');
      
      expect(mockExplorer.load).toHaveBeenCalledWith('/path/to/config.js');
      expect(config.font?.main).toBe('Custom Font');
      expect(config.debug).toBe(true);
    });

    it('should search for config when no path specified', () => {
      const foundConfig = {
        page: { size: 'Letter' }
      };
      
      mockExplorer.search.mockReturnValue({ config: foundConfig });
      
      const config = loadConfig();
      
      expect(mockExplorer.search).toHaveBeenCalled();
      expect(config.page?.size).toBe('Letter');
    });

    it('should merge user config with defaults', () => {
      const userConfig = {
        font: { size: 14 },
        mermaid: { theme: 'dark' }
      };
      
      mockExplorer.search.mockReturnValue({ config: userConfig });
      
      const config = loadConfig();
      
      // User config should override defaults
      expect(config.font?.size).toBe(14);
      expect(config.mermaid?.theme).toBe('dark');
      
      // Default values should be preserved
      expect(config.font?.main).toContain('system-ui');
      expect(config.pageBreak?.beforeH1).toBe(true);
    });

    it('should handle nested config merging', () => {
      const userConfig = {
        page: {
          margin: { top: '3cm' }
        }
      };
      
      mockExplorer.search.mockReturnValue({ config: userConfig });
      
      const config = loadConfig();
      
      expect(config.page?.margin?.top).toBe('3cm');
      expect(config.page?.margin?.right).toBe('2cm'); // Default preserved
      expect(config.page?.size).toBe('A4'); // Default preserved
    });
  });

  describe('mergeOptions', () => {
    it('should merge CLI options with config', () => {
      const baseConfig: MarkPaperConfig = {
        font: { main: 'Base Font', size: 12 },
        debug: false
      };
      
      const options: Partial<MarkPaperConfig> = {
        font: { size: 14 },
        debug: true,
        output: 'output.pdf'
      };
      
      const merged = mergeOptions(baseConfig, options);
      
      expect(merged.font?.main).toBe('Base Font');
      expect(merged.font?.size).toBe(14);
      expect(merged.debug).toBe(true);
      expect(merged.output).toBe('output.pdf');
    });

    it('should handle undefined values correctly', () => {
      const baseConfig: MarkPaperConfig = {
        font: { main: 'Base Font' },
        debug: true
      };
      
      const options: Partial<MarkPaperConfig> = {
        font: undefined,
        debug: undefined
      };
      
      const merged = mergeOptions(baseConfig, options);
      
      expect(merged.font?.main).toBe('Base Font');
      expect(merged.debug).toBe(true);
    });

    it('should override arrays completely', () => {
      const baseConfig: MarkPaperConfig = {
        pageBreak: {
          avoidInside: ['pre', 'code']
        }
      };
      
      const options: Partial<MarkPaperConfig> = {
        pageBreak: {
          avoidInside: ['table']
        }
      };
      
      const merged = mergeOptions(baseConfig, options);
      
      expect(merged.pageBreak?.avoidInside).toEqual(['table']);
    });

    it('should handle null values', () => {
      const baseConfig: MarkPaperConfig = {
        css: 'base.css'
      };
      
      const options: Partial<MarkPaperConfig> = {
        css: undefined
      };
      
      const merged = mergeOptions(baseConfig, options);
      
      expect(merged.css).toBe('base.css');
    });
  });
});