import { expect } from 'chai';
import { clc, isColorAllowed, yellow } from '../../utils/cli-colors.util';

describe('cli-colors', () => {
  afterEach(() => {
    delete process.env.NO_COLOR;
  });

  describe('isColorAllowed', () => {
    it('should return true by default', () => {
      expect(isColorAllowed()).to.be.true;
    });

    it('should return false when NO_COLOR is set', () => {
      process.env.NO_COLOR = '1';
      expect(isColorAllowed()).to.be.false;
    });
  });

  describe('clc', () => {
    it('green should wrap text in ANSI green codes', () => {
      expect(clc.green('text')).to.equal('\x1B[32mtext\x1B[39m');
    });

    it('bold should wrap text in ANSI bold codes', () => {
      expect(clc.bold('text')).to.equal('\x1B[1mtext\x1B[0m');
    });

    it('should return raw text for all methods when NO_COLOR is set', () => {
      process.env.NO_COLOR = '1';
      const formatters = [
        'bold',
        'green',
        'yellow',
        'red',
        'magentaBright',
        'cyanBright',
      ] as const;
      formatters.forEach(key => {
        expect(clc[key]('text')).to.equal('text');
      });
    });
  });

  describe('yellow', () => {
    it('should wrap text in extended ANSI yellow codes', () => {
      expect(yellow('text')).to.equal('\x1B[38;5;3mtext\x1B[39m');
    });
  });
});
