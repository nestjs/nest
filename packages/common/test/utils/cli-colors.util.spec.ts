import { expect } from 'chai';
import { colorText, isColorAllowed, clc } from '../../utils/cli-colors.util';

describe('cli-colors.util', () => {
  const noColorEnv = 'NO_COLOR';

  describe('isColorAllowed', () => {
    beforeEach(() => {
      delete process.env[noColorEnv];
    });

    it('should return false when NO_COLOR is set', () => {
      process.env[noColorEnv] = '1';
      expect(isColorAllowed()).to.be.false;
    });

    it('should return true when NO_COLOR is not set', () => {
      expect(isColorAllowed()).to.be.true;
    });
  });

  describe('colorText', () => {
    beforeEach(() => {
      delete process.env[noColorEnv];
    });

    it('should return plain text when NO_COLOR is set', () => {
      process.env[noColorEnv] = '1';
      expect(colorText('MyContext', 'hello')).to.equal('hello');
    });

    it('should return text wrapped with ANSI escape codes when colors are allowed', () => {
      const result = colorText('MyContext', 'hello');
      expect(result).to.include('\x1B[');
      expect(result).to.include('hello');
      expect(result).to.include('\x1B[39m');
    });

    it('should produce deterministic color for the same context', () => {
      const a = colorText('SameContext', 'text');
      const b = colorText('SameContext', 'text');
      expect(a).to.equal(b);
    });

    it('should produce different colors for different contexts', () => {
      const a = colorText('ContextA', 'text');
      const b = colorText('ContextB', 'text');
      expect(a).not.to.equal(b);
    });

    it('should color the given text only (second argument)', () => {
      const text = 'message';
      const result = colorText('Context', text);
      const reset = '\x1B[39m';
      const openingCode = colorText('Context', '').slice(0, -reset.length);
      const expected = `${openingCode}${text}${reset}`;
      expect(result).to.equal(expected);
    });
  });
});
