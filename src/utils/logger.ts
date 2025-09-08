import chalk from 'chalk';

export class Logger {
  private debug: boolean = false;

  constructor(debug: boolean = false) {
    this.debug = debug;
  }

  info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }

  success(message: string): void {
    console.log(chalk.green('✓'), message);
  }

  warn(message: string): void {
    console.log(chalk.yellow('⚠'), message);
  }

  error(message: string): void {
    console.log(chalk.red('✗'), message);
  }

  debugLog(message: string): void {
    if (this.debug) {
      console.log(chalk.gray('🐛'), chalk.gray(message));
    }
  }

  setDebug(debug: boolean): void {
    this.debug = debug;
  }
}