import { expect } from 'chai';
import { LogLevel } from '../../../services/logger.service';
import { isLogLevelEnabled } from '../../../services/utils';

describe('isLogLevelEnabled', () => {
  const tests = [
    { inputArgs: ['log', ['log']], expectedReturnValue: true },
    { inputArgs: ['debug', ['debug']], expectedReturnValue: true },
    { inputArgs: ['verbose', ['verbose']], expectedReturnValue: true },
    { inputArgs: ['error', ['error']], expectedReturnValue: true },
    { inputArgs: ['warn', ['warn']], expectedReturnValue: true },
    /** explicitly included + log level is higher than target */
    { inputArgs: ['log', ['error', 'log']], expectedReturnValue: true },
    { inputArgs: ['warn', ['warn', 'error']], expectedReturnValue: true },
    { inputArgs: ['debug', ['warn', 'debug']], expectedReturnValue: true },
    { inputArgs: ['verbose', ['error', 'verbose']], expectedReturnValue: true },
    /** not explicitly included + log level is higher than target */
    { inputArgs: ['log', ['error', 'warn']], expectedReturnValue: false },
    { inputArgs: ['verbose', ['warn']], expectedReturnValue: false },
    { inputArgs: ['debug', ['warn', 'error']], expectedReturnValue: false },
    { inputArgs: ['warn', ['error']], expectedReturnValue: false },
  ];

  for (const { inputArgs, expectedReturnValue } of tests) {
    describe(`when log levels = [${inputArgs[1] as string}]`, () => {
      describe(`and target level is "${inputArgs[0] as string}"`, () => {
        it('should return true', () => {
          expect(
            isLogLevelEnabled(...(inputArgs as [LogLevel, LogLevel[]])),
          ).to.equal(expectedReturnValue);
        });
      });
    });
  }

  describe(`when log levels = undefined`, () => {
    it('should return false', () => {
      expect(isLogLevelEnabled('warn', undefined)).to.be.false;
    });
  });
});
