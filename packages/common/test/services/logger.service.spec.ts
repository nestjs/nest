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

        expect(processStderrWriteSpy.firstCall.firstArg).to.include(
          `Object(${Object.keys(error).length})`,
        );
        expect(processStderrWriteSpy.firstCall.firstArg).to.include(
          `randomError: \x1b[33mtrue`,
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

    describe('when the default logger is used and json mode is enabled', () => {
      const logger = new ConsoleLogger({ json: true });

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

      it('should print error with stack as JSON to the console', () => {
        const errorMessage = 'error message';
        const error = new Error(errorMessage);

        logger.error(error.message, error.stack);

        const json = JSON.parse(processStderrWriteSpy.firstCall?.firstArg);

        expect(json.pid).to.equal(process.pid);
        expect(json.level).to.equal('error');
        expect(json.message).to.equal(errorMessage);
      });
      it('should log out to stdout as JSON', () => {
        const message = 'message 1';

        logger.log(message);

        const json = JSON.parse(processStdoutWriteSpy.firstCall?.firstArg);

        expect(json.pid).to.equal(process.pid);
        expect(json.level).to.equal('log');
        expect(json.message).to.equal(message);
      });
      it('should log out an error to stderr as JSON', () => {
        const message = 'message 1';

        logger.error(message);

        const json = JSON.parse(processStderrWriteSpy.firstCall?.firstArg);

        expect(json.pid).to.equal(process.pid);
        expect(json.level).to.equal('error');
        expect(json.message).to.equal(message);
      });
      it('should log Map object', () => {
        const map = new Map([
          ['key1', 'value1'],
          ['key2', 'value2'],
        ]);

        logger.log(map);

        const json = JSON.parse(processStdoutWriteSpy.firstCall?.firstArg);

        expect(json.pid).to.equal(process.pid);
        expect(json.level).to.equal('log');
        expect(json.message).to.equal(
          `Map(2) { 'key1' => 'value1', 'key2' => 'value2' }`,
        );
      });
      it('should log Set object', () => {
        const set = new Set(['value1', 'value2']);

        logger.log(set);

        const json = JSON.parse(processStdoutWriteSpy.firstCall?.firstArg);

        expect(json.pid).to.equal(process.pid);
        expect(json.level).to.equal('log');
        expect(json.message).to.equal(`Set(2) { 'value1', 'value2' }`);
      });
      it('should log bigint', () => {
        const bigInt = BigInt(9007199254740991);

        logger.log(bigInt);

        const json = JSON.parse(processStdoutWriteSpy.firstCall?.firstArg);

        expect(json.pid).to.equal(process.pid);
        expect(json.level).to.equal('log');
        expect(json.message).to.equal('9007199254740991');
      });
      it('should log symbol', () => {
        const symbol = Symbol('test');

        logger.log(symbol);

        const json = JSON.parse(processStdoutWriteSpy.firstCall?.firstArg);

        expect(json.pid).to.equal(process.pid);
        expect(json.level).to.equal('log');
        expect(json.message).to.equal('Symbol(test)');
      });
    });

    describe('when the default logger is used, json mode is enabled and compact is false (utils.inspect)', () => {
      const logger = new ConsoleLogger({ json: true, compact: false });

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

      it('should log out to stdout as JSON (utils.inspect)', () => {
        const message = 'message 1';

        logger.log(message);

        const json = convertInspectToJSON(
          processStdoutWriteSpy.firstCall?.firstArg,
        );

        expect(json.pid).to.equal(process.pid);
        expect(json.level).to.equal('log');
        expect(json.message).to.equal(message);
      });

      it('should log out an error to stderr as JSON (utils.inspect)', () => {
        const message = 'message 1';

        logger.error(message);

        const json = convertInspectToJSON(
          processStderrWriteSpy.firstCall?.firstArg,
        );

        expect(json.pid).to.equal(process.pid);
        expect(json.level).to.equal('error');
        expect(json.message).to.equal(message);
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

    describe('classes for message', () => {
      let processStdoutWriteSpy: sinon.SinonSpy;

      beforeEach(() => {
        processStdoutWriteSpy = sinon.spy(process.stdout, 'write');
      });
      afterEach(() => {
        processStdoutWriteSpy.restore();
      });

      it("should display class's name or empty for anonymous classes", () => {
        const logger = new ConsoleLogger();

        // in-line anonymous class
        logger.log(class {});

        // named class
        class Test {
          publicField = 'public field';
        }
        logger.log(Test);

        expect(processStdoutWriteSpy.firstCall.firstArg).to.include('');
        expect(processStdoutWriteSpy.secondCall.firstArg).to.include(Test.name);
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
        const stacktrace = new Error('err').stack;

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
          return `Prefix: ${message as string}`;
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

      const consoleLogger = new CustomConsoleLogger({ colors: false });
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
        `Object(1) {
  key: 'str2'
}`,
      );
      expect(consoleLoggerSpy.getCall(2).returnValue).to.equal(
        `Array(1) [
  'str3'
]`,
      );
      expect(consoleLoggerSpy.getCall(3).returnValue).to.equal(
        `Array(1) [
  {
    key: 'str4'
  }
]`,
      );
      expect(consoleLoggerSpy.getCall(4).returnValue).to.equal('null');
      expect(consoleLoggerSpy.getCall(5).returnValue).to.equal('1');
    });
  });
});

function convertInspectToJSON(inspectOutput: string) {
  const jsonLikeString = inspectOutput
    .replace(/'([^']+)'/g, '"$1"') // single-quoted strings
    .replace(/([a-zA-Z0-9_]+):/g, '"$1":') // unquoted object keys
    .replace(/\bundefined\b/g, 'null')
    .replace(/\[Function(: [^\]]+)?\]/g, '"[Function]"')
    .replace(/\[Circular\]/g, '"[Circular]"');

  try {
    return JSON.parse(jsonLikeString);
  } catch (error) {
    console.error('Error parsing the modified inspect output:', error);
    throw error;
  }
}
