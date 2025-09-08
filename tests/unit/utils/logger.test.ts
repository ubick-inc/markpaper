import { Logger } from '../../../src/utils/logger';
import chalk from 'chalk';

// Mock chalk to avoid terminal color codes in tests
jest.mock('chalk', () => ({
  blue: jest.fn((text) => `[BLUE]${text}`),
  green: jest.fn((text) => `[GREEN]${text}`),
  yellow: jest.fn((text) => `[YELLOW]${text}`),
  red: jest.fn((text) => `[RED]${text}`),
  gray: jest.fn((text) => `[GRAY]${text}`)
}));

describe('Logger', () => {
  let logger: Logger;
  let consoleLogSpy: jest.SpyInstance;
  
  beforeEach(() => {
    logger = new Logger();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('info', () => {
    it('should log info message with blue icon', () => {
      logger.info('Info message');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[BLUE]ℹ', 'Info message');
      expect(chalk.blue).toHaveBeenCalledWith('ℹ');
    });
  });

  describe('success', () => {
    it('should log success message with green checkmark', () => {
      logger.success('Success message');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[GREEN]✓', 'Success message');
      expect(chalk.green).toHaveBeenCalledWith('✓');
    });
  });

  describe('warn', () => {
    it('should log warning message with yellow icon', () => {
      logger.warn('Warning message');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[YELLOW]⚠', 'Warning message');
      expect(chalk.yellow).toHaveBeenCalledWith('⚠');
    });
  });

  describe('error', () => {
    it('should log error message with red X', () => {
      logger.error('Error message');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[RED]✗', 'Error message');
      expect(chalk.red).toHaveBeenCalledWith('✗');
    });
  });

  describe('debugLog', () => {
    it('should not log when debug is false', () => {
      logger.debugLog('Debug message');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log when debug is true', () => {
      logger = new Logger(true);
      logger.debugLog('Debug message');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[GRAY]🐛', '[GRAY]Debug message');
      expect(chalk.gray).toHaveBeenCalledWith('🐛');
      expect(chalk.gray).toHaveBeenCalledWith('Debug message');
    });

    it('should log after setDebug(true)', () => {
      logger.setDebug(true);
      logger.debugLog('Debug message');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[GRAY]🐛', '[GRAY]Debug message');
    });

    it('should not log after setDebug(false)', () => {
      logger = new Logger(true);
      logger.setDebug(false);
      logger.debugLog('Debug message');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('setDebug', () => {
    it('should enable debug mode', () => {
      logger.setDebug(true);
      logger.debugLog('Test');
      
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should disable debug mode', () => {
      logger = new Logger(true);
      logger.setDebug(false);
      logger.debugLog('Test');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });
});