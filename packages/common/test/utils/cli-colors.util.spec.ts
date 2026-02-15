import { clc, isColorAllowed, yellow } from '../../utils/cli-colors.util.js';

describe('cli-colors.util', () => {
  const originalEnv = process.env.NO_COLOR;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NO_COLOR;
    } else {
      process.env.NO_COLOR = originalEnv;
    }
  });

  describe('isColorAllowed', () => {
    it('should return true when NO_COLOR is not set', () => {
      delete process.env.NO_COLOR;
      expect(isColorAllowed()).toBe(true);
    });

    it('should return false when NO_COLOR is set', () => {
      process.env.NO_COLOR = '1';
      expect(isColorAllowed()).toBe(false);
    });

    it('should return true when NO_COLOR is an empty string', () => {
      process.env.NO_COLOR = '';
      expect(isColorAllowed()).toBe(true);
    });
  });

  describe('clc (color enabled)', () => {
    beforeEach(() => {
      delete process.env.NO_COLOR;
    });

    it('should wrap text in bold ANSI codes', () => {
      expect(clc.bold('hello')).toBe('\x1B[1mhello\x1B[0m');
    });

    it('should wrap text in green ANSI codes', () => {
      expect(clc.green('hello')).toBe('\x1B[32mhello\x1B[39m');
    });

    it('should wrap text in yellow ANSI codes', () => {
      expect(clc.yellow('hello')).toBe('\x1B[33mhello\x1B[39m');
    });

    it('should wrap text in red ANSI codes', () => {
      expect(clc.red('hello')).toBe('\x1B[31mhello\x1B[39m');
    });

    it('should wrap text in magentaBright ANSI codes', () => {
      expect(clc.magentaBright('hello')).toBe('\x1B[95mhello\x1B[39m');
    });

    it('should wrap text in cyanBright ANSI codes', () => {
      expect(clc.cyanBright('hello')).toBe('\x1B[96mhello\x1B[39m');
    });
  });

  describe('clc (color disabled)', () => {
    beforeEach(() => {
      process.env.NO_COLOR = '1';
    });

    it('should return plain text for bold', () => {
      expect(clc.bold('hello')).toBe('hello');
    });

    it('should return plain text for green', () => {
      expect(clc.green('hello')).toBe('hello');
    });

    it('should return plain text for yellow', () => {
      expect(clc.yellow('hello')).toBe('hello');
    });

    it('should return plain text for red', () => {
      expect(clc.red('hello')).toBe('hello');
    });

    it('should return plain text for magentaBright', () => {
      expect(clc.magentaBright('hello')).toBe('hello');
    });

    it('should return plain text for cyanBright', () => {
      expect(clc.cyanBright('hello')).toBe('hello');
    });
  });

  describe('yellow (standalone)', () => {
    it('should use 38;5;3 ANSI code when color is allowed', () => {
      delete process.env.NO_COLOR;
      expect(yellow('hello')).toBe('\x1B[38;5;3mhello\x1B[39m');
    });

    it('should return plain text when color is disabled', () => {
      process.env.NO_COLOR = '1';
      expect(yellow('hello')).toBe('hello');
    });
  });
});
