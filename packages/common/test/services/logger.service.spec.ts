import { expect } from 'chai';
import 'reflect-metadata';
import * as sinon from 'sinon';
import { ConsoleLogger, Logger, LoggerService, LogLevel } from '../../services';

describe('Logger', () => {
  describe('[static methods]', () => {
    describe('when the default logger is used', () => {
      let processStdoutWriteSpy: sinon.SinonSpy;
      let processStderrWriteSpy: sinon.SinonSpy;

      beforeEach(() => {
        processStdoutWriteSpy = sinon.spy(process.stdout, 'write');
        processStderrWriteSpy = sinon.spy(process.stderr, 'write');
      });

      afterEach(() => {
        processStdoutWriteSpy.restore();
        processStderrWriteSpy.restore();
      });

      it('should print one message to the console', () => {
        const message = 'random message';
        const context = 'RandomContext';

        Logger.log(message, context);

        expect(processStdoutWriteSpy.calledOnce).to.be.true;
        expect(processStdoutWriteSpy.firstCall.firstArg).to.include(
          `[${context}]`,
        );
        expect(processStdoutWriteSpy.firstCall.firstArg).to.include(message);
      });

      it('should print one message without context to the console', () => {
        const message = 'random message without context';

        Logger.log(message);

        expect(processStdoutWriteSpy.calledOnce).to.be.true;
        expect(processStdoutWriteSpy.firstCall.firstArg).to.include(message);
      });

      it('should print multiple messages to the console', () => {
        const messages = ['message 1', 'message 2', 'message 3'];
        const context = 'RandomContext';

        Logger.log(messages[0], messages[1], messages[2], context);

        expect(processStdoutWriteSpy.calledThrice).to.be.true;
        expect(processStdoutWriteSpy.firstCall.firstArg).to.include(
          `[${context}]`,
        );
        expect(processStdoutWriteSpy.firstCall.firstArg).to.include(
          messages[0],
        );

        expect(processStdoutWriteSpy.secondCall.firstArg).to.include(
          `[${context}]`,
        );
        expect(processStdoutWriteSpy.secondCall.firstArg).to.include(
          messages[1],
        );

        expect(processStdoutWriteSpy.thirdCall.firstArg).to.include(
          `[${context}]`,
        );
        expect(processStdoutWriteSpy.thirdCall.firstArg).to.include(
          messages[2],
        );
      });

      it('should print one error to the console with context', () => {
        const message = 'random error';
        const context = 'RandomContext';

        Logger.error(message, context);

        expect(processStderrWriteSpy.calledOnce).to.be.true;
        expect(processStderrWriteSpy.firstCall.firstArg).to.include(
          `[${context}]`,
        );
        expect(processStderrWriteSpy.firstCall.firstArg).to.include(message);
      });

      it('should print one error to the console with stacktrace', () => {
        const message = 'random error';
        const stacktrace = 'Error: message\n    at <anonymous>:1:2';

        Logger.error(message, stacktrace);

        expect(processStderrWriteSpy.calledTwice).to.be.true;
        expect(processStderrWriteSpy.firstCall.firstArg).to.not.include(`[]`);
        expect(processStderrWriteSpy.firstCall.firstArg).to.include(message);
        expect(processStderrWriteSpy.secondCall.firstArg).to.equal(
          stacktrace + '\n',
        );
      });

      it('should print one error without context to the console', () => {
        const message = 'random error without context';

        Logger.error(message);

        expect(processStderrWriteSpy.calledOnce).to.be.true;
        expect(processStderrWriteSpy.firstCall.firstArg).to.include(message);
      });

      it('should print error object without context to the console', () => {
        const error = new Error('Random text here');

        Logger.error(error);

        expect(processStderrWriteSpy.calledOnce).to.be.true;
        expect(processStderrWriteSpy.firstCall.firstArg).to.include(
          `Error: Random text here`,
        );
      });

      it('should serialise a plain JS object (as a message) without context to the console', () => {
        const error = {
          randomError: true,
        };

        Logger.error(error);

        expect(processStderrWriteSpy.calledOnce).to.be.true;
        expect(processStderrWriteSpy.firstCall.firstArg).to.include(`Object:`);
        expect(processStderrWriteSpy.firstCall.firstArg).to.include(
          `{\n  "randomError": true\n}`,
        );
      });

      it('should print one error with stacktrace and context to the console', () => {
        const message = 'random error with context';
        const stacktrace = 'stacktrace';
        const context = 'ErrorContext';

        Logger.error(message, stacktrace, context);

        expect(processStderrWriteSpy.calledTwice).to.be.true;

        expect(processStderrWriteSpy.firstCall.firstArg).to.include(
          `[${context}]`,
        );
        expect(processStderrWriteSpy.firstCall.firstArg).to.include(message);

        expect(processStderrWriteSpy.secondCall.firstArg).to.equal(
          stacktrace + '\n',
        );
        expect(processStderrWriteSpy.secondCall.firstArg).to.not.include(
          context,
        );
      });

      it('should print multiple 2 errors and one stacktrace to the console', () => {
        const messages = ['message 1', 'message 2'];
        const stack = 'stacktrace';
        const context = 'RandomContext';

        Logger.error(messages[0], messages[1], stack, context);

        expect(processStderrWriteSpy.calledThrice).to.be.true;
        expect(processStderrWriteSpy.firstCall.firstArg).to.include(
          `[${context}]`,
        );
        expect(processStderrWriteSpy.firstCall.firstArg).to.include(
          messages[0],
        );

        expect(processStderrWriteSpy.secondCall.firstArg).to.include(
          `[${context}]`,
        );
        expect(processStderrWriteSpy.secondCall.firstArg).to.include(
          messages[1],
        );

        expect(processStderrWriteSpy.thirdCall.firstArg).to.not.include(
          `[${context}]`,
        );
        expect(processStderrWriteSpy.thirdCall.firstArg).to.equal(stack + '\n');
      });
    });
    describe('when logging is disabled', () => {
      let processStdoutWriteSpy: sinon.SinonSpy;
      let previousLoggerRef: LoggerService;

      beforeEach(() => {
        processStdoutWriteSpy = sinon.spy(process.stdout, 'write');

        previousLoggerRef =
          Logger['localInstanceRef'] || Logger['staticInstanceRef'];
        Logger.overrideLogger(false);
      });

      afterEach(() => {
        processStdoutWriteSpy.restore();

        Logger.overrideLogger(previousLoggerRef);
      });

      it('should not print any message to the console', () => {
        const message = 'random message';
        const context = 'RandomContext';

        Logger.log(message, context);

        expect(processStdoutWriteSpy.called).to.be.false;
      });
    });
    describe('when custom logger is being used', () => {
      class CustomLogger implements LoggerService {
        log(message: any, context?: string) {}
        error(message: any, trace?: string, context?: string) {}
        warn(message: any, context?: string) {}
      }

      const customLogger = new CustomLogger();
      let previousLoggerRef: LoggerService;

      beforeEach(() => {
        previousLoggerRef =
          Logger['localInstanceRef'] || Logger['staticInstanceRef'];
        Logger.overrideLogger(customLogger);
      });

      afterEach(() => {
        Logger.overrideLogger(previousLoggerRef);
      });

      it('should call custom logger "#log()" method', () => {
        const message = 'random message';
        const context = 'RandomContext';

        const customLoggerLogSpy = sinon.spy(customLogger, 'log');

        Logger.log(message, context);

        expect(customLoggerLogSpy.called).to.be.true;
        expect(customLoggerLogSpy.calledWith(message, context)).to.be.true;
      });

      it('should call custom logger "#error()" method', () => {
        const message = 'random message';
        const context = 'RandomContext';

        const customLoggerErrorSpy = sinon.spy(customLogger, 'error');

        Logger.error(message, context);

        expect(customLoggerErrorSpy.called).to.be.true;
        expect(customLoggerErrorSpy.calledWith(message, context)).to.be.true;
      });
    });
  });

  describe('ConsoleLogger', () => {
    it('should allow setting and resetting of context', () => {
      const logger = new ConsoleLogger();
      expect(logger['context']).to.be.undefined;
      logger.setContext('context');
      expect(logger['context']).to.equal('context');
      logger.resetContext();
      expect(logger['context']).to.be.undefined;

      const loggerWithContext = new ConsoleLogger('context');
      expect(loggerWithContext['context']).to.equal('context');
      loggerWithContext.setContext('other');
      expect(loggerWithContext['context']).to.equal('other');
      loggerWithContext.resetContext();
      expect(loggerWithContext['context']).to.equal('context');
    });

    describe('functions for message', () => {
      let processStdoutWriteSpy: sinon.SinonSpy;
      const logger = new ConsoleLogger();
      const message = 'Hello World';

      beforeEach(() => {
        processStdoutWriteSpy = sinon.spy(process.stdout, 'write');
      });
      afterEach(() => {
        processStdoutWriteSpy.restore();
      });

      it('works', () => {
        logger.log(() => message);

        expect(processStdoutWriteSpy.calledOnce).to.be.true;
        expect(processStdoutWriteSpy.firstCall.firstArg).to.include(message);
        // Ensure we didn't serialize the function itself.
        expect(processStdoutWriteSpy.firstCall.firstArg).not.to.include(' => ');
        expect(processStdoutWriteSpy.firstCall.firstArg).not.to.include(
          'function',
        );
        expect(processStdoutWriteSpy.firstCall.firstArg).not.to.include(
          'Function',
        );
      });
    });
  });

  describe('[instance methods]', () => {
    describe('when the default logger is used', () => {
      const logger = new Logger();

      let processStdoutWriteSpy: sinon.SinonSpy;
      let processStderrWriteSpy: sinon.SinonSpy;

      beforeEach(() => {
        processStdoutWriteSpy = sinon.spy(process.stdout, 'write');
        processStderrWriteSpy = sinon.spy(process.stderr, 'write');
      });

      afterEach(() => {
        processStdoutWriteSpy.restore();
        processStderrWriteSpy.restore();
      });

      it('should print one message to the console', () => {
        const message = 'random message';
        const context = 'RandomContext';

        logger.log(message, context);

        expect(processStdoutWriteSpy.calledOnce).to.be.true;
        expect(processStdoutWriteSpy.firstCall.firstArg).to.include(
          `[${context}]`,
        );
        expect(processStdoutWriteSpy.firstCall.firstArg).to.include(message);
      });

      it('should print one message without context to the console', () => {
        const message = 'random message without context';

        logger.log(message);

        expect(processStdoutWriteSpy.calledOnce).to.be.true;
        expect(processStdoutWriteSpy.firstCall.firstArg).to.include(message);
      });

      it('should print multiple messages to the console', () => {
        const messages = ['message 1', 'message 2', 'message 3'];
        const context = 'RandomContext';

        logger.log(messages[0], messages[1], messages[2], context);

        expect(processStdoutWriteSpy.calledThrice).to.be.true;
        expect(processStdoutWriteSpy.firstCall.firstArg).to.include(
          `[${context}]`,
        );
        expect(processStdoutWriteSpy.firstCall.firstArg).to.include(
          messages[0],
        );

        expect(processStdoutWriteSpy.secondCall.firstArg).to.include(
          `[${context}]`,
        );
        expect(processStdoutWriteSpy.secondCall.firstArg).to.include(
          messages[1],
        );

        expect(processStdoutWriteSpy.thirdCall.firstArg).to.include(
          `[${context}]`,
        );
        expect(processStdoutWriteSpy.thirdCall.firstArg).to.include(
          messages[2],
        );
      });

      it('should print one error to the console with context', () => {
        const message = 'random error';
        const context = 'RandomContext';

        logger.error(message, context);

        expect(processStderrWriteSpy.calledOnce).to.be.true;
        expect(processStderrWriteSpy.firstCall.firstArg).to.include(
          `[${context}]`,
        );
        expect(processStderrWriteSpy.firstCall.firstArg).to.include(message);
      });

      it('should print one error to the console with stacktrace', () => {
        const message = 'random error';
        const stacktrace = 'Error: message\n    at <anonymous>:1:2';

        logger.error(message, stacktrace);

        expect(processStderrWriteSpy.calledTwice).to.be.true;
        expect(processStderrWriteSpy.firstCall.firstArg).to.not.include(`[]`);
        expect(processStderrWriteSpy.firstCall.firstArg).to.include(message);
        expect(processStderrWriteSpy.secondCall.firstArg).to.equal(
          stacktrace + '\n',
        );
      });

      it('should print one error without context to the console', () => {
        const message = 'random error without context';

        logger.error(message);

        expect(processStderrWriteSpy.calledOnce).to.be.true;
        expect(processStderrWriteSpy.firstCall.firstArg).to.include(message);
      });

      it('should print one error with stacktrace and context to the console', () => {
        const message = 'random error with context';
        const stacktrace = 'stacktrace';
        const context = 'ErrorContext';

        logger.error(message, stacktrace, context);

        expect(processStderrWriteSpy.calledTwice).to.be.true;

        expect(processStderrWriteSpy.firstCall.firstArg).to.include(
          `[${context}]`,
        );
        expect(processStderrWriteSpy.firstCall.firstArg).to.include(message);

        expect(processStderrWriteSpy.secondCall.firstArg).to.equal(
          stacktrace + '\n',
        );
      });

      it('should print 2 errors and one stacktrace to the console', () => {
        const messages = ['message 1', 'message 2'];
        const stack = 'stacktrace';
        const context = 'RandomContext';

        logger.error(messages[0], messages[1], stack, context);

        expect(processStderrWriteSpy.calledThrice).to.be.true;
        expect(processStderrWriteSpy.firstCall.firstArg).to.include(
          `[${context}]`,
        );
        expect(processStderrWriteSpy.firstCall.firstArg).to.include(
          messages[0],
        );

        expect(processStderrWriteSpy.secondCall.firstArg).to.include(
          `[${context}]`,
        );
        expect(processStderrWriteSpy.secondCall.firstArg).to.include(
          messages[1],
        );

        expect(processStderrWriteSpy.thirdCall.firstArg).to.not.include(
          `[${context}]`,
        );
        expect(processStderrWriteSpy.thirdCall.firstArg).to.equal(stack + '\n');
      });
    });

    describe('when the default logger is used and global context is set and timestamp enabled', () => {
      const globalContext = 'GlobalContext';
      const logger = new Logger(globalContext, { timestamp: true });

      let processStdoutWriteSpy: sinon.SinonSpy;
      let processStderrWriteSpy: sinon.SinonSpy;

      beforeEach(() => {
        processStdoutWriteSpy = sinon.spy(process.stdout, 'write');
        processStderrWriteSpy = sinon.spy(process.stderr, 'write');
      });

      afterEach(() => {
        processStdoutWriteSpy.restore();
        processStderrWriteSpy.restore();
      });

      it('should print multiple messages to the console and append global context', () => {
        const messages = ['message 1', 'message 2', 'message 3'];

        logger.log(messages[0], messages[1], messages[2]);

        expect(processStdoutWriteSpy.calledThrice).to.be.true;
        expect(processStdoutWriteSpy.firstCall.firstArg).to.include(
          `[${globalContext}]`,
        );
        expect(processStdoutWriteSpy.firstCall.firstArg).to.include(
          messages[0],
        );

        expect(processStdoutWriteSpy.secondCall.firstArg).to.include(
          `[${globalContext}]`,
        );
        expect(processStdoutWriteSpy.secondCall.firstArg).to.include(
          messages[1],
        );
        expect(processStdoutWriteSpy.secondCall.firstArg).to.include('ms');

        expect(processStdoutWriteSpy.thirdCall.firstArg).to.include(
          `[${globalContext}]`,
        );
        expect(processStdoutWriteSpy.thirdCall.firstArg).to.include(
          messages[2],
        );
        expect(processStdoutWriteSpy.thirdCall.firstArg).to.include('ms');
      });
      it('should log out an error to stderr but not include an undefined log', () => {
        const message = 'message 1';

        logger.error(message);

        expect(processStderrWriteSpy.calledOnce).to.be.true;
        expect(processStderrWriteSpy.firstCall.firstArg).to.include(
          `[${globalContext}]`,
        );
        expect(processStderrWriteSpy.firstCall.firstArg).to.include(message);
      });
    });

    describe('when logging is disabled', () => {
      const logger = new Logger();

      let processStdoutWriteSpy: sinon.SinonSpy;
      let previousLoggerRef: LoggerService;

      beforeEach(() => {
        processStdoutWriteSpy = sinon.spy(process.stdout, 'write');

        previousLoggerRef =
          Logger['localInstanceRef'] || Logger['staticInstanceRef'];
        Logger.overrideLogger(false);
      });

      afterEach(() => {
        processStdoutWriteSpy.restore();

        Logger.overrideLogger(previousLoggerRef);
      });

      it('should not print any message to the console', () => {
        const message = 'random message';
        const context = 'RandomContext';

        logger.log(message, context);

        expect(processStdoutWriteSpy.called).to.be.false;
      });
    });
    describe('when custom logger is being used', () => {
      class CustomLogger implements LoggerService {
        log(message: any, context?: string) {}
        error(message: any, trace?: string, context?: string) {}
        warn(message: any, context?: string) {}
      }

      describe('with global context', () => {
        const customLogger = new CustomLogger();
        const globalContext = 'RandomContext';
        const originalLogger = new Logger(globalContext);

        let previousLoggerRef: LoggerService;

        beforeEach(() => {
          previousLoggerRef =
            Logger['localInstanceRef'] || Logger['staticInstanceRef'];
          Logger.overrideLogger(customLogger);
        });

        afterEach(() => {
          Logger.overrideLogger(previousLoggerRef);
        });

        it('should call custom logger "#log()" method with context as second argument', () => {
          const message = 'random log message with global context';

          const customLoggerLogSpy = sinon.spy(customLogger, 'log');

          originalLogger.log(message);

          expect(customLoggerLogSpy.called).to.be.true;
          expect(customLoggerLogSpy.calledWith(message, globalContext)).to.be
            .true;
        });
        it('should call custom logger "#error()" method with context as third argument', () => {
          const message = 'random error message with global context';

          const customLoggerErrorSpy = sinon.spy(customLogger, 'error');

          originalLogger.error(message);

          expect(customLoggerErrorSpy.called).to.be.true;
          expect(
            customLoggerErrorSpy.calledWith(message, undefined, globalContext),
          ).to.be.true;
        });
      });
      describe('without global context', () => {
        const customLogger = new CustomLogger();
        const originalLogger = new Logger();

        let previousLoggerRef: LoggerService;

        beforeEach(() => {
          previousLoggerRef =
            Logger['localInstanceRef'] || Logger['staticInstanceRef'];
          Logger.overrideLogger(customLogger);
        });

        afterEach(() => {
          Logger.overrideLogger(previousLoggerRef);
        });

        it('should call custom logger "#log()" method', () => {
          const message = 'random message';
          const context = 'RandomContext';

          const customLoggerLogSpy = sinon.spy(customLogger, 'log');

          originalLogger.log(message, context);

          expect(customLoggerLogSpy.called).to.be.true;
          expect(customLoggerLogSpy.calledWith(message, context)).to.be.true;
        });

        it('should call custom logger "#error()" method', () => {
          const message = 'random message';
          const context = 'RandomContext';

          const customLoggerErrorSpy = sinon.spy(customLogger, 'error');

          originalLogger.error(message, undefined, context);

          expect(customLoggerErrorSpy.called).to.be.true;
          expect(customLoggerErrorSpy.calledWith(message, undefined, context))
            .to.be.true;
        });
      });
    });
  });
  describe('ConsoleLogger', () => {
    let processStdoutWriteSpy: sinon.SinonSpy;

    beforeEach(() => {
      processStdoutWriteSpy = sinon.spy(process.stdout, 'write');
    });
    afterEach(() => {
      processStdoutWriteSpy.restore();
    });

    it('should support custom formatter', () => {
      class CustomConsoleLogger extends ConsoleLogger {
        protected formatMessage(
          logLevel: LogLevel,
          message: unknown,
          pidMessage: string,
          formattedLogLevel: string,
          contextMessage: string,
          timestampDiff: string,
        ) {
          return `Prefix: ${message}`;
        }
      }

      const consoleLogger = new CustomConsoleLogger();
      consoleLogger.debug('test');

      expect(processStdoutWriteSpy.firstCall.firstArg).to.equal(`Prefix: test`);
    });

    it('should support custom formatter and colorizer', () => {
      class CustomConsoleLogger extends ConsoleLogger {
        protected formatMessage(
          logLevel: LogLevel,
          message: unknown,
          pidMessage: string,
          formattedLogLevel: string,
          contextMessage: string,
          timestampDiff: string,
        ) {
          const strMessage = this.stringifyMessage(message, logLevel);
          return `Prefix: ${strMessage}`;
        }

        protected colorize(message: string, logLevel: LogLevel): string {
          return `~~~${message}~~~`;
        }
      }

      const consoleLogger = new CustomConsoleLogger();
      consoleLogger.debug('test');

      expect(processStdoutWriteSpy.firstCall.firstArg).to.equal(
        `Prefix: ~~~test~~~`,
      );
    });

    it('should stringify messages', () => {
      class CustomConsoleLogger extends ConsoleLogger {
        protected colorize(message: string, _: LogLevel): string {
          return message;
        }
      }

      const consoleLogger = new CustomConsoleLogger();
      const consoleLoggerSpy = sinon.spy(
        consoleLogger,
        'stringifyMessage' as keyof ConsoleLogger,
      );
      consoleLogger.debug(
        'str1',
        { key: 'str2' },
        ['str3'],
        [{ key: 'str4' }],
        null,
        1,
      );

      expect(consoleLoggerSpy.getCall(0).returnValue).to.equal('str1');
      expect(consoleLoggerSpy.getCall(1).returnValue).to.equal(
        `Object:
{
  "key": "str2"
}
`,
      );
      expect(consoleLoggerSpy.getCall(2).returnValue).to.equal(
        `Object:
[
  "str3"
]
`,
      );
      expect(consoleLoggerSpy.getCall(3).returnValue).to.equal(
        `Object:
[
  {
    "key": "str4"
  }
]
`,
      );
      expect(consoleLoggerSpy.getCall(4).returnValue).to.equal(null);
      expect(consoleLoggerSpy.getCall(5).returnValue).to.equal(1);
    });
  });
});
