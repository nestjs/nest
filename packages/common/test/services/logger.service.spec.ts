import {
  ConsoleLogger,
  Logger,
  LoggerService,
  LogLevel,
} from '../../services/index.js';

describe('Logger', () => {
  describe('[static methods]', () => {
    describe('when the default logger is used', () => {
      let processStdoutWriteSpy: ReturnType<typeof vi.fn>;
      let processStderrWriteSpy: ReturnType<typeof vi.fn>;

      beforeEach(() => {
        processStdoutWriteSpy = vi.spyOn(process.stdout, 'write');
        processStderrWriteSpy = vi.spyOn(process.stderr, 'write');
      });

      afterEach(() => {
        processStdoutWriteSpy.mockRestore();
        processStderrWriteSpy.mockRestore();
      });

      it('should print one message to the console', () => {
        const message = 'random message';
        const context = 'RandomContext';

        Logger.log(message, context);

        expect(processStdoutWriteSpy).toHaveBeenCalledOnce();
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(
          `[${context}]`,
        );
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(message);
      });

      it('should print one message without context to the console', () => {
        const message = 'random message without context';

        Logger.log(message);

        expect(processStdoutWriteSpy).toHaveBeenCalledOnce();
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(message);
      });

      it('should print multiple messages to the console', () => {
        const messages = ['message 1', 'message 2', 'message 3'];
        const context = 'RandomContext';

        Logger.log(messages[0], messages[1], messages[2], context);

        expect(processStdoutWriteSpy).toHaveBeenCalledTimes(3);
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(
          `[${context}]`,
        );
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(messages[0]);

        expect(processStdoutWriteSpy.mock.calls[1][0]).toContain(
          `[${context}]`,
        );
        expect(processStdoutWriteSpy.mock.calls[1][0]).toContain(messages[1]);

        expect(processStdoutWriteSpy.mock.calls[2][0]).toContain(
          `[${context}]`,
        );
        expect(processStdoutWriteSpy.mock.calls[2][0]).toContain(messages[2]);
      });

      it('should print one error to the console with context', () => {
        const message = 'random error';
        const context = 'RandomContext';

        Logger.error(message, context);

        expect(processStderrWriteSpy).toHaveBeenCalledOnce();
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(
          `[${context}]`,
        );
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(message);
      });

      it('should print one error to the console with stacktrace', () => {
        const message = 'random error';
        const stacktrace = 'Error: message\n    at <anonymous>:1:2';

        Logger.error(message, stacktrace);

        expect(processStderrWriteSpy).toHaveBeenCalledTimes(2);
        expect(processStderrWriteSpy.mock.calls[0][0]).not.toContain(`[]`);
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(message);
        expect(processStderrWriteSpy.mock.calls[1][0]).toBe(stacktrace + '\n');
      });

      it('should print one error without context to the console', () => {
        const message = 'random error without context';

        Logger.error(message);

        expect(processStderrWriteSpy).toHaveBeenCalledOnce();
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(message);
      });

      it('should print error object without context to the console', () => {
        const error = new Error('Random text here');

        Logger.error(error);

        expect(processStderrWriteSpy).toHaveBeenCalledOnce();
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(
          `Error: Random text here`,
        );
      });

      it('should serialise a plain JS object (as a message) without context to the console', () => {
        const error = {
          randomError: true,
        };

        Logger.error(error);

        expect(processStderrWriteSpy).toHaveBeenCalledOnce();

        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(
          `Object(${Object.keys(error).length})`,
        );
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(
          `randomError: \x1b[33mtrue`,
        );
      });

      it('should print one error with stacktrace and context to the console', () => {
        const message = 'random error with context';
        const stacktrace = 'stacktrace';
        const context = 'ErrorContext';

        Logger.error(message, stacktrace, context);

        expect(processStderrWriteSpy).toHaveBeenCalledTimes(2);

        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(
          `[${context}]`,
        );
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(message);

        expect(processStderrWriteSpy.mock.calls[1][0]).toBe(stacktrace + '\n');
        expect(processStderrWriteSpy.mock.calls[1][0]).not.toContain(context);
      });

      it('should print multiple 2 errors and one stacktrace to the console', () => {
        const messages = ['message 1', 'message 2'];
        const stack = 'stacktrace';
        const context = 'RandomContext';

        Logger.error(messages[0], messages[1], stack, context);

        expect(processStderrWriteSpy).toHaveBeenCalledTimes(3);
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(
          `[${context}]`,
        );
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(messages[0]);

        expect(processStderrWriteSpy.mock.calls[1][0]).toContain(
          `[${context}]`,
        );
        expect(processStderrWriteSpy.mock.calls[1][0]).toContain(messages[1]);

        expect(processStderrWriteSpy.mock.calls[2][0]).not.toContain(
          `[${context}]`,
        );
        expect(processStderrWriteSpy.mock.calls[2][0]).toBe(stack + '\n');
      });
    });

    describe('when the default logger is used and json mode is enabled', () => {
      const logger = new ConsoleLogger({ json: true });

      let processStdoutWriteSpy: ReturnType<typeof vi.fn>;
      let processStderrWriteSpy: ReturnType<typeof vi.fn>;

      beforeEach(() => {
        processStdoutWriteSpy = vi.spyOn(process.stdout, 'write');
        processStderrWriteSpy = vi.spyOn(process.stderr, 'write');
      });

      afterEach(() => {
        processStdoutWriteSpy.mockRestore();
        processStderrWriteSpy.mockRestore();
      });

      it('should print error with stack as JSON to the console', () => {
        const errorMessage = 'error message';
        const error = new Error(errorMessage);

        logger.error(error.message, error.stack);

        const json = JSON.parse(processStderrWriteSpy.mock.calls[0]?.[0]);

        expect(json.pid).toBe(process.pid);
        expect(json.level).toBe('error');
        expect(json.message).toBe(errorMessage);
      });
      it('should log out to stdout as JSON', () => {
        const message = 'message 1';

        logger.log(message);

        const json = JSON.parse(processStdoutWriteSpy.mock.calls[0]?.[0]);

        expect(json.pid).toBe(process.pid);
        expect(json.level).toBe('log');
        expect(json.message).toBe(message);
      });
      it('should log out an error to stderr as JSON', () => {
        const message = 'message 1';

        logger.error(message);

        const json = JSON.parse(processStderrWriteSpy.mock.calls[0]?.[0]);

        expect(json.pid).toBe(process.pid);
        expect(json.level).toBe('error');
        expect(json.message).toBe(message);
      });
      it('should log Map object', () => {
        const map = new Map([
          ['key1', 'value1'],
          ['key2', 'value2'],
        ]);

        logger.log(map);

        const json = JSON.parse(processStdoutWriteSpy.mock.calls[0]?.[0]);

        expect(json.pid).toBe(process.pid);
        expect(json.level).toBe('log');
        expect(json.message).toBe(
          `Map(2) { 'key1' => 'value1', 'key2' => 'value2' }`,
        );
      });
      it('should log Set object', () => {
        const set = new Set(['value1', 'value2']);

        logger.log(set);

        const json = JSON.parse(processStdoutWriteSpy.mock.calls[0]?.[0]);

        expect(json.pid).toBe(process.pid);
        expect(json.level).toBe('log');
        expect(json.message).toBe(`Set(2) { 'value1', 'value2' }`);
      });
      it('should log bigint', () => {
        const bigInt = BigInt(9007199254740991);

        logger.log(bigInt);

        const json = JSON.parse(processStdoutWriteSpy.mock.calls[0]?.[0]);

        expect(json.pid).toBe(process.pid);
        expect(json.level).toBe('log');
        expect(json.message).toBe('9007199254740991');
      });
      it('should log symbol', () => {
        const symbol = Symbol('test');

        logger.log(symbol);

        const json = JSON.parse(processStdoutWriteSpy.mock.calls[0]?.[0]);

        expect(json.pid).toBe(process.pid);
        expect(json.level).toBe('log');
        expect(json.message).toBe('Symbol(test)');
      });
    });

    describe('when the default logger is used, json mode is enabled and compact is false (utils.inspect)', () => {
      const logger = new ConsoleLogger({ json: true, compact: false });

      let processStdoutWriteSpy: ReturnType<typeof vi.fn>;
      let processStderrWriteSpy: ReturnType<typeof vi.fn>;

      beforeEach(() => {
        processStdoutWriteSpy = vi.spyOn(process.stdout, 'write');
        processStderrWriteSpy = vi.spyOn(process.stderr, 'write');
      });

      afterEach(() => {
        processStdoutWriteSpy.mockRestore();
        processStderrWriteSpy.mockRestore();
      });

      it('should log out to stdout as JSON (utils.inspect)', () => {
        const message = 'message 1';

        logger.log(message);

        const json = convertInspectToJSON(
          processStdoutWriteSpy.mock.calls[0]?.[0],
        );

        expect(json.pid).toBe(process.pid);
        expect(json.level).toBe('log');
        expect(json.message).toBe(message);
      });

      it('should log out an error to stderr as JSON (utils.inspect)', () => {
        const message = 'message 1';

        logger.error(message);

        const json = convertInspectToJSON(
          processStderrWriteSpy.mock.calls[0]?.[0],
        );

        expect(json.pid).toBe(process.pid);
        expect(json.level).toBe('error');
        expect(json.message).toBe(message);
      });
    });

    describe('when logging is disabled', () => {
      let processStdoutWriteSpy: ReturnType<typeof vi.fn>;
      let previousLoggerRef: LoggerService;

      beforeEach(() => {
        processStdoutWriteSpy = vi.spyOn(process.stdout, 'write');

        previousLoggerRef =
          Logger['localInstanceRef'] || Logger['staticInstanceRef'];
        Logger.overrideLogger(false);
      });

      afterEach(() => {
        processStdoutWriteSpy.mockRestore();

        Logger.overrideLogger(previousLoggerRef);
      });

      it('should not print any message to the console', () => {
        const message = 'random message';
        const context = 'RandomContext';

        Logger.log(message, context);

        expect(processStdoutWriteSpy).not.toHaveBeenCalled();
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

        const customLoggerLogSpy = vi.spyOn(customLogger, 'log');

        Logger.log(message, context);

        expect(customLoggerLogSpy).toHaveBeenCalled();
        expect(customLoggerLogSpy).toHaveBeenCalledWith(message, context);
      });

      it('should call custom logger "#error()" method', () => {
        const message = 'random message';
        const context = 'RandomContext';

        const customLoggerErrorSpy = vi.spyOn(customLogger, 'error');

        Logger.error(message, context);

        expect(customLoggerErrorSpy).toHaveBeenCalled();
        expect(customLoggerErrorSpy).toHaveBeenCalledWith(message, context);
      });
    });
  });

  describe('ConsoleLogger', () => {
    it('should allow setting and resetting of context', () => {
      const logger = new ConsoleLogger();
      expect(logger['context']).toBeUndefined();
      logger.setContext('context');
      expect(logger['context']).toBe('context');
      logger.resetContext();
      expect(logger['context']).toBeUndefined();

      const loggerWithContext = new ConsoleLogger('context');
      expect(loggerWithContext['context']).toBe('context');
      loggerWithContext.setContext('other');
      expect(loggerWithContext['context']).toBe('other');
      loggerWithContext.resetContext();
      expect(loggerWithContext['context']).toBe('context');
    });

    describe('functions for message', () => {
      let processStdoutWriteSpy: ReturnType<typeof vi.fn>;
      const logger = new ConsoleLogger();
      const message = 'Hello World';

      beforeEach(() => {
        processStdoutWriteSpy = vi.spyOn(process.stdout, 'write');
      });
      afterEach(() => {
        processStdoutWriteSpy.mockRestore();
      });

      it('works', () => {
        logger.log(() => message);

        expect(processStdoutWriteSpy).toHaveBeenCalledOnce();
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(message);
        // Ensure we didn't serialize the function itself.
        expect(processStdoutWriteSpy.mock.calls[0][0]).not.toContain(' => ');
        expect(processStdoutWriteSpy.mock.calls[0][0]).not.toContain(
          'function',
        );
        expect(processStdoutWriteSpy.mock.calls[0][0]).not.toContain(
          'Function',
        );
      });
    });

    describe('classes for message', () => {
      let processStdoutWriteSpy: ReturnType<typeof vi.fn>;

      beforeEach(() => {
        processStdoutWriteSpy = vi.spyOn(process.stdout, 'write');
      });
      afterEach(() => {
        processStdoutWriteSpy.mockRestore();
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

        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain('');
        expect(processStdoutWriteSpy.mock.calls[1][0]).toContain(Test.name);
      });
    });

    describe('forceConsole option', () => {
      let consoleLogSpy: ReturnType<typeof vi.fn>;
      let consoleErrorSpy: ReturnType<typeof vi.fn>;
      let processStdoutWriteStub: ReturnType<typeof vi.fn>;
      let processStderrWriteStub: ReturnType<typeof vi.fn>;

      beforeEach(() => {
        // Stub process.stdout.write to prevent actual output and track calls
        processStdoutWriteStub = vi
          .spyOn(process.stdout, 'write')
          .mockImplementation(() => ({}) as any);
        processStderrWriteStub = vi
          .spyOn(process.stderr, 'write')
          .mockImplementation(() => ({}) as any);
        consoleLogSpy = vi.spyOn(console, 'log');
        consoleErrorSpy = vi.spyOn(console, 'error');
      });

      afterEach(() => {
        processStdoutWriteStub.mockRestore();
        processStderrWriteStub.mockRestore();
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
      });

      it('should use console.log instead of process.stdout.write when forceConsole is true', () => {
        const logger = new ConsoleLogger({ forceConsole: true });
        const message = 'test message';

        logger.log(message);

        // When forceConsole is true, console.log should be called
        expect(consoleLogSpy).toHaveBeenCalled();
        expect(consoleLogSpy.mock.calls[0][0]).toContain(message);
      });

      it('should use console.error instead of process.stderr.write when forceConsole is true', () => {
        const logger = new ConsoleLogger({ forceConsole: true });
        const message = 'error message';

        logger.error(message);

        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(consoleErrorSpy.mock.calls[0][0]).toContain(message);
      });

      it('should use console.error for stack traces when forceConsole is true', () => {
        const logger = new ConsoleLogger({ forceConsole: true });
        const message = 'error with stack';
        const stack = 'Error: test\n    at <anonymous>:1:1';

        logger.error(message, stack);

        expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
        expect(consoleErrorSpy.mock.calls[0][0]).toContain(message);
        expect(consoleErrorSpy.mock.calls[1][0]).toBe(stack);
      });

      it('should use process.stdout.write when forceConsole is false', () => {
        const logger = new ConsoleLogger({ forceConsole: false });
        const message = 'test message';

        logger.log(message);

        expect(processStdoutWriteStub).toHaveBeenCalled();
        expect(processStdoutWriteStub.mock.calls[0][0]).toContain(message);
        expect(consoleLogSpy).not.toHaveBeenCalled();
      });

      it('should work with JSON mode and forceConsole', () => {
        const logger = new ConsoleLogger({ json: true, forceConsole: true });
        const message = 'json message';

        logger.log(message);

        expect(consoleLogSpy).toHaveBeenCalled();

        const output = consoleLogSpy.mock.calls[0][0];
        const json = JSON.parse(output);
        expect(json.message).toBe(message);
      });
    });
  });

  describe('[instance methods]', () => {
    describe('when the default logger is used', () => {
      const logger = new Logger();

      let processStdoutWriteSpy: ReturnType<typeof vi.fn>;
      let processStderrWriteSpy: ReturnType<typeof vi.fn>;

      beforeEach(() => {
        processStdoutWriteSpy = vi.spyOn(process.stdout, 'write');
        processStderrWriteSpy = vi.spyOn(process.stderr, 'write');
      });

      afterEach(() => {
        processStdoutWriteSpy.mockRestore();
        processStderrWriteSpy.mockRestore();
      });

      it('should print one message to the console', () => {
        const message = 'random message';
        const context = 'RandomContext';

        logger.log(message, context);

        expect(processStdoutWriteSpy).toHaveBeenCalledOnce();
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(
          `[${context}]`,
        );
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(message);
      });

      it('should print one message without context to the console', () => {
        const message = 'random message without context';

        logger.log(message);

        expect(processStdoutWriteSpy).toHaveBeenCalledOnce();
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(message);
      });

      it('should print multiple messages to the console', () => {
        const messages = ['message 1', 'message 2', 'message 3'];
        const context = 'RandomContext';

        logger.log(messages[0], messages[1], messages[2], context);

        expect(processStdoutWriteSpy).toHaveBeenCalledTimes(3);
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(
          `[${context}]`,
        );
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(messages[0]);

        expect(processStdoutWriteSpy.mock.calls[1][0]).toContain(
          `[${context}]`,
        );
        expect(processStdoutWriteSpy.mock.calls[1][0]).toContain(messages[1]);

        expect(processStdoutWriteSpy.mock.calls[2][0]).toContain(
          `[${context}]`,
        );
        expect(processStdoutWriteSpy.mock.calls[2][0]).toContain(messages[2]);
      });

      it('should print one error to the console with context', () => {
        const message = 'random error';
        const context = 'RandomContext';

        logger.error(message, context);

        expect(processStderrWriteSpy).toHaveBeenCalledOnce();
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(
          `[${context}]`,
        );
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(message);
      });

      it('should print one error to the console with stacktrace', () => {
        const message = 'random error';
        const stacktrace = new Error('err').stack;

        logger.error(message, stacktrace);

        expect(processStderrWriteSpy).toHaveBeenCalledTimes(2);
        expect(processStderrWriteSpy.mock.calls[0][0]).not.toContain(`[]`);
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(message);
        expect(processStderrWriteSpy.mock.calls[1][0]).toBe(stacktrace + '\n');
      });

      it('should print one error without context to the console', () => {
        const message = 'random error without context';

        logger.error(message);

        expect(processStderrWriteSpy).toHaveBeenCalledOnce();
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(message);
      });

      it('should print one error with stacktrace and context to the console', () => {
        const message = 'random error with context';
        const stacktrace = 'stacktrace';
        const context = 'ErrorContext';

        logger.error(message, stacktrace, context);

        expect(processStderrWriteSpy).toHaveBeenCalledTimes(2);

        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(
          `[${context}]`,
        );
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(message);

        expect(processStderrWriteSpy.mock.calls[1][0]).toBe(stacktrace + '\n');
      });

      it('should print 2 errors and one stacktrace to the console', () => {
        const messages = ['message 1', 'message 2'];
        const stack = 'stacktrace';
        const context = 'RandomContext';

        logger.error(messages[0], messages[1], stack, context);

        expect(processStderrWriteSpy).toHaveBeenCalledTimes(3);
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(
          `[${context}]`,
        );
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(messages[0]);

        expect(processStderrWriteSpy.mock.calls[1][0]).toContain(
          `[${context}]`,
        );
        expect(processStderrWriteSpy.mock.calls[1][0]).toContain(messages[1]);

        expect(processStderrWriteSpy.mock.calls[2][0]).not.toContain(
          `[${context}]`,
        );
        expect(processStderrWriteSpy.mock.calls[2][0]).toBe(stack + '\n');
      });
    });

    describe('when the default logger is used and global context is set and timestamp enabled', () => {
      const globalContext = 'GlobalContext';
      const logger = new Logger(globalContext, { timestamp: true });

      let processStdoutWriteSpy: ReturnType<typeof vi.fn>;
      let processStderrWriteSpy: ReturnType<typeof vi.fn>;

      beforeEach(() => {
        processStdoutWriteSpy = vi.spyOn(process.stdout, 'write');
        processStderrWriteSpy = vi.spyOn(process.stderr, 'write');
      });

      afterEach(() => {
        processStdoutWriteSpy.mockRestore();
        processStderrWriteSpy.mockRestore();
      });

      it('should print multiple messages to the console and append global context', () => {
        const messages = ['message 1', 'message 2', 'message 3'];

        logger.log(messages[0], messages[1], messages[2]);

        expect(processStdoutWriteSpy).toHaveBeenCalledTimes(3);
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(
          `[${globalContext}]`,
        );
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(messages[0]);

        expect(processStdoutWriteSpy.mock.calls[1][0]).toContain(
          `[${globalContext}]`,
        );
        expect(processStdoutWriteSpy.mock.calls[1][0]).toContain(messages[1]);
        expect(processStdoutWriteSpy.mock.calls[1][0]).toContain('ms');

        expect(processStdoutWriteSpy.mock.calls[2][0]).toContain(
          `[${globalContext}]`,
        );
        expect(processStdoutWriteSpy.mock.calls[2][0]).toContain(messages[2]);
        expect(processStdoutWriteSpy.mock.calls[2][0]).toContain('ms');
      });
      it('should log out an error to stderr but not include an undefined log', () => {
        const message = 'message 1';

        logger.error(message);

        expect(processStderrWriteSpy).toHaveBeenCalledOnce();
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(
          `[${globalContext}]`,
        );
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(message);
      });
    });

    describe('when logging is disabled', () => {
      const logger = new Logger();

      let processStdoutWriteSpy: ReturnType<typeof vi.fn>;
      let previousLoggerRef: LoggerService;

      beforeEach(() => {
        processStdoutWriteSpy = vi.spyOn(process.stdout, 'write');

        previousLoggerRef =
          Logger['localInstanceRef'] || Logger['staticInstanceRef'];
        Logger.overrideLogger(false);
      });

      afterEach(() => {
        processStdoutWriteSpy.mockRestore();

        Logger.overrideLogger(previousLoggerRef);
      });

      it('should not print any message to the console', () => {
        const message = 'random message';
        const context = 'RandomContext';

        logger.log(message, context);

        expect(processStdoutWriteSpy).not.toHaveBeenCalled();
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

          const customLoggerLogSpy = vi.spyOn(customLogger, 'log');

          originalLogger.log(message);

          expect(customLoggerLogSpy).toHaveBeenCalled();
          expect(customLoggerLogSpy).toHaveBeenCalledWith(
            message,
            globalContext,
          );
        });
        it('should call custom logger "#error()" method with context as third argument', () => {
          const message = 'random error message with global context';

          const customLoggerErrorSpy = vi.spyOn(customLogger, 'error');

          originalLogger.error(message);

          expect(customLoggerErrorSpy).toHaveBeenCalled();
          expect(customLoggerErrorSpy).toHaveBeenCalledWith(
            message,
            undefined,
            globalContext,
          );
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

          const customLoggerLogSpy = vi.spyOn(customLogger, 'log');

          originalLogger.log(message, context);

          expect(customLoggerLogSpy).toHaveBeenCalled();
          expect(customLoggerLogSpy).toHaveBeenCalledWith(message, context);
        });

        it('should call custom logger "#error()" method', () => {
          const message = 'random message';
          const context = 'RandomContext';

          const customLoggerErrorSpy = vi.spyOn(customLogger, 'error');

          originalLogger.error(message, undefined, context);

          expect(customLoggerErrorSpy).toHaveBeenCalled();
          expect(customLoggerErrorSpy).toHaveBeenCalledWith(
            message,
            undefined,
            context,
          );
        });
      });
    });
  });
  describe('ConsoleLogger', () => {
    let processStdoutWriteSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      processStdoutWriteSpy = vi.spyOn(process.stdout, 'write');
    });
    afterEach(() => {
      processStdoutWriteSpy.mockRestore();
    });

    it('should respect maxStringLength when set to 0', () => {
      const consoleLogger = new ConsoleLogger({
        colors: false,
        compact: false,
        maxStringLength: 0,
      });

      consoleLogger.log({ name: 'abcdef' });

      expect(processStdoutWriteSpy).toHaveBeenCalledOnce();
      expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(
        "''... 6 more characters",
      );
    });

    it('should respect maxArrayLength when set to 0', () => {
      const consoleLogger = new ConsoleLogger({
        colors: false,
        compact: false,
        maxArrayLength: 0,
      });

      consoleLogger.log({ items: ['a', 'b', 'c'] });

      expect(processStdoutWriteSpy).toHaveBeenCalledOnce();
      expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(
        '... 3 more items',
      );
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

      expect(processStdoutWriteSpy.mock.calls[0][0]).toBe(`Prefix: test`);
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

      expect(processStdoutWriteSpy.mock.calls[0][0]).toBe(`Prefix: ~~~test~~~`);
    });

    it('should stringify messages (plain objects extracted as params)', () => {
      class CustomConsoleLogger extends ConsoleLogger {
        protected colorize(message: string, _: LogLevel): string {
          return message;
        }
      }

      const consoleLogger = new CustomConsoleLogger({ colors: false });
      const consoleLoggerSpy = vi.spyOn(
        consoleLogger as any,
        'stringifyMessage',
      );
      // { key: 'str2' } is now extracted as params, not passed through stringifyMessage
      consoleLogger.debug(
        'str1',
        { key: 'str2' },
        ['str3'],
        [{ key: 'str4' }],
        null,
        1,
      );

      // stringifyMessage is called for: 'str1', ['str3'], [{ key: 'str4' }], null, 1
      // { key: 'str2' } is extracted as params
      expect(consoleLoggerSpy.mock.results[0].value).toBe('str1');
      expect(consoleLoggerSpy.mock.results[1].value).toBe(
        `Array(1) [
  'str3'
]`,
      );
      expect(consoleLoggerSpy.mock.results[2].value).toBe(
        `Array(1) [
  {
    key: 'str4'
  }
]`,
      );
      expect(consoleLoggerSpy.mock.results[3].value).toBe('null');
      expect(consoleLoggerSpy.mock.results[4].value).toBe('1');
    });
  });

  describe('ConsoleLogger - structured logging params', () => {
    let processStdoutWriteSpy: ReturnType<typeof vi.fn>;
    let processStderrWriteSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      processStdoutWriteSpy = vi.spyOn(process.stdout, 'write');
      processStderrWriteSpy = vi.spyOn(process.stderr, 'write');
    });
    afterEach(() => {
      processStdoutWriteSpy.mockRestore();
      processStderrWriteSpy.mockRestore();
    });

    describe('text mode', () => {
      class DeterministicConsoleLogger extends ConsoleLogger {
        protected formatPid() {
          return '[Nest] 123  - ';
        }

        protected getTimestamp(): string {
          return '01/01/2026, 12:00:00 AM';
        }

        protected updateAndGetTimestampDiff(): string {
          return '';
        }
      }

      it('should inline single plain object as params after message', () => {
        const logger = new DeterministicConsoleLogger({ colors: false });
        logger.log('User created', { userId: 1 });

        expect(processStdoutWriteSpy).toHaveBeenCalledOnce();
        expect(processStdoutWriteSpy.mock.calls[0][0]).toBe(
          '[Nest] 123  - 01/01/2026, 12:00:00 AM     LOG User created { userId: 1 }\n',
        );
      });

      it('should merge multiple plain objects into single params', () => {
        const logger = new DeterministicConsoleLogger({ colors: false });
        logger.log('Request', { userId: 1 }, { reqId: 'abc' });

        expect(processStdoutWriteSpy).toHaveBeenCalledOnce();
        expect(processStdoutWriteSpy.mock.calls[0][0]).toBe(
          "[Nest] 123  - 01/01/2026, 12:00:00 AM     LOG Request { userId: 1, reqId: 'abc' }\n",
        );
      });

      it('should treat plain object as first arg as message, not params', () => {
        const logger = new ConsoleLogger({ colors: false });
        logger.log({ randomError: true });

        expect(processStdoutWriteSpy).toHaveBeenCalledOnce();
        const output = processStdoutWriteSpy.mock.calls[0][0];
        expect(output).toContain('Object(1)');
        expect(output).toContain('randomError: true');
      });

      it('should keep strings as messages and extract objects as params', () => {
        const logger = new DeterministicConsoleLogger({ colors: false });
        logger.log('msg1', 'msg2', { meta: true }, 'Context');

        // msg1 and msg2 are messages, { meta: true } is params, 'Context' is context
        expect(processStdoutWriteSpy).toHaveBeenCalledTimes(2);
        expect(processStdoutWriteSpy.mock.calls[0][0]).toBe(
          '[Nest] 123  - 01/01/2026, 12:00:00 AM     LOG [Context] msg1 { meta: true }\n',
        );
        expect(processStdoutWriteSpy.mock.calls[1][0]).toBe(
          '[Nest] 123  - 01/01/2026, 12:00:00 AM     LOG [Context] msg2 { meta: true }\n',
        );
      });

      it('should not treat arrays as params', () => {
        const logger = new ConsoleLogger({ colors: false });
        logger.log('msg', [1, 2, 3]);

        // Array stays as a separate message, not params
        expect(processStdoutWriteSpy).toHaveBeenCalledTimes(2);
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain('msg');
        expect(processStdoutWriteSpy.mock.calls[1][0]).toContain('Array(3)');
      });
    });

    describe('JSON mode', () => {
      it('should include params under params key', () => {
        const logger = new ConsoleLogger({ json: true });
        logger.log('User created', { userId: 1 }, 'UserService');

        const json = JSON.parse(processStdoutWriteSpy.mock.calls[0][0]);
        expect(json.message).toBe('User created');
        expect(json.context).toBe('UserService');
        expect(json.params).toEqual({ userId: 1 });
      });

      it('should not include params key when no objects are passed', () => {
        const logger = new ConsoleLogger({ json: true });
        logger.log('simple message');

        const json = JSON.parse(processStdoutWriteSpy.mock.calls[0][0]);
        expect(json.message).toBe('simple message');
        expect(json.params).toBeUndefined();
      });

      it('should include params, stack, and context for error', () => {
        const logger = new ConsoleLogger({ json: true });
        const stack = 'Error: test\n    at <anonymous>:1:1';
        logger.error('fail', { reqId: 'abc' }, stack, 'AppService');

        const json = JSON.parse(processStderrWriteSpy.mock.calls[0][0]);
        expect(json.message).toBe('fail');
        expect(json.context).toBe('AppService');
        expect(json.stack).toBe(stack);
        expect(json.params).toEqual({ reqId: 'abc' });
      });

      it('should keep reserved keys nested under params by default', () => {
        const logger = new ConsoleLogger({ json: true });
        logger.log(
          'User created',
          { message: 'override', level: 'debug' },
          'UserService',
        );

        const json = JSON.parse(processStdoutWriteSpy.mock.calls[0][0]);
        expect(json.level).toBe('log');
        expect(json.message).toBe('User created');
        expect(json.context).toBe('UserService');
        expect(json.params).toEqual({ message: 'override', level: 'debug' });
      });

      it('should flatten params to root when flattenParams is true', () => {
        const logger = new ConsoleLogger({ json: true, flattenParams: true });
        logger.log('User created', { userId: 1, action: 'create' }, 'Svc');

        const json = JSON.parse(processStdoutWriteSpy.mock.calls[0][0]);
        expect(json.message).toBe('User created');
        expect(json.context).toBe('Svc');
        expect(json.userId).toBe(1);
        expect(json.action).toBe('create');
        expect(json.params).toBeUndefined();
      });

      it('should handle error with params but no stack', () => {
        const logger = new ConsoleLogger({ json: true });
        logger.error('fail', { reqId: 'abc' }, 'AppService');

        const json = JSON.parse(processStderrWriteSpy.mock.calls[0][0]);
        expect(json.message).toBe('fail');
        expect(json.context).toBe('AppService');
        expect(json.params).toEqual({ reqId: 'abc' });
        expect(json.stack).toBeUndefined();
      });

      it('should treat trailing stack-like string as stack when params are present', () => {
        const logger = new ConsoleLogger({ json: true });
        const stack = 'Error: test\n    at AppService.run (app.ts:1:1)';
        logger.error('fail', { reqId: 'abc' }, stack);

        const json = JSON.parse(processStderrWriteSpy.mock.calls[0][0]);
        expect(json.message).toBe('fail');
        expect(json.context).toBeUndefined();
        expect(json.params).toEqual({ reqId: 'abc' });
        expect(json.stack).toBe(stack);
      });
    });

    describe('structuredParams: false (legacy behavior)', () => {
      it('should treat plain objects as separate messages in text mode', () => {
        const logger = new ConsoleLogger({
          colors: false,
          structuredParams: false,
        });
        logger.log('User created', { userId: 1 });

        // Two write calls: one for the message, one for the object
        expect(processStdoutWriteSpy).toHaveBeenCalledTimes(2);
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain(
          'User created',
        );
        expect(processStdoutWriteSpy.mock.calls[1][0]).toContain('Object(1)');
        expect(processStdoutWriteSpy.mock.calls[1][0]).toContain('userId: 1');
      });

      it('should treat plain objects as separate JSON entries', () => {
        const logger = new ConsoleLogger({
          json: true,
          structuredParams: false,
        });
        logger.log('User created', { userId: 1 });

        // Two JSON lines: one for the string, one for the object
        expect(processStdoutWriteSpy).toHaveBeenCalledTimes(2);
        const json1 = JSON.parse(processStdoutWriteSpy.mock.calls[0][0]);
        const json2 = JSON.parse(processStdoutWriteSpy.mock.calls[1][0]);
        expect(json1.message).toBe('User created');
        expect(json1.params).toBeUndefined();
        expect(json2.message).toEqual({ userId: 1 });
      });
    });
  });

  describe('ConsoleLogger - JSON mode', () => {
    let processStdoutWriteSpy: ReturnType<typeof vi.fn>;
    let processStderrWriteSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      processStdoutWriteSpy = vi
        .spyOn(process.stdout, 'write')
        .mockImplementation(() => true);
      processStderrWriteSpy = vi
        .spyOn(process.stderr, 'write')
        .mockImplementation(() => true);
    });
    afterEach(() => {
      processStdoutWriteSpy.mockRestore();
      processStderrWriteSpy.mockRestore();
    });

    describe('circular structures', () => {
      it('should replace circular references instead of throwing', () => {
        const logger = new ConsoleLogger('Ctx', { json: true });
        const payload: Record<string, any> = { id: 1 };
        payload.self = payload;

        expect(() => logger.log('message', payload)).not.toThrow();

        const json = JSON.parse(processStdoutWriteSpy.mock.calls[0][0]);
        expect(json.message).toBe('message');
        // "params" is a merged copy, so the cycle closes one level deeper.
        expect(json.params).toEqual({
          id: 1,
          self: { id: 1, self: '[Circular]' },
        });
      });

      it('should replace circular references in the message itself', () => {
        const logger = new ConsoleLogger({ json: true });
        const list: any[] = [1];
        list.push({ list });

        expect(() => logger.log(list)).not.toThrow();

        const json = JSON.parse(processStdoutWriteSpy.mock.calls[0][0]);
        expect(json.message).toEqual([1, { list: '[Circular]' }]);
      });

      it('should keep repeated (non-circular) references intact', () => {
        const logger = new ConsoleLogger({ json: true });
        const shared = { a: 1 };

        logger.log('message', { first: shared, second: shared });

        const json = JSON.parse(processStdoutWriteSpy.mock.calls[0][0]);
        expect(json.params).toEqual({ first: { a: 1 }, second: { a: 1 } });
      });

      it('should still serialize bigint, symbol, Map and Set values', () => {
        const logger = new ConsoleLogger({ json: true });
        const nested: Record<string, any> = {};
        nested.self = nested;
        const payload = {
          big: BigInt(10),
          sym: Symbol('s'),
          map: new Map([['k', 'v']]),
          set: new Set([1]),
          nested,
        };

        logger.log('message', payload);

        const json = JSON.parse(processStdoutWriteSpy.mock.calls[0][0]);
        expect(json.params).toEqual({
          big: '10',
          sym: 'Symbol(s)',
          map: `Map(1) { 'k' => 'v' }`,
          set: 'Set(1) { 1 }',
          nested: { self: '[Circular]' },
        });
      });

      it('should not throw when a value cannot be serialized', () => {
        const logger = new ConsoleLogger({ json: true });
        const payload = {
          toJSON() {
            throw new Error('boom');
          },
        };

        expect(() => logger.log('message', { payload })).not.toThrow();
        expect(processStdoutWriteSpy).toHaveBeenCalledOnce();
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain('message');
      });
    });

    describe('function and class messages', () => {
      it('should evaluate a lazy message', () => {
        const logger = new ConsoleLogger({ json: true });

        logger.log(() => 'lazy message');

        const json = JSON.parse(processStdoutWriteSpy.mock.calls[0][0]);
        expect(json.message).toBe('lazy message');
      });

      it('should evaluate a lazy message that returns an object', () => {
        const logger = new ConsoleLogger({ json: true });

        logger.log(() => ({ answer: 42 }));

        const json = JSON.parse(processStdoutWriteSpy.mock.calls[0][0]);
        expect(json.message).toEqual({ answer: 42 });
      });

      it('should not evaluate a lazy message when the level is disabled', () => {
        const logger = new ConsoleLogger({ json: true, logLevels: ['log'] });
        const factory = vi.fn(() => 'expensive');

        logger.debug(factory);

        expect(factory).not.toHaveBeenCalled();
        expect(processStdoutWriteSpy).not.toHaveBeenCalled();
      });

      it("should print a class's name", () => {
        const logger = new ConsoleLogger({ json: true });
        class Test {}

        logger.log(Test);

        const json = JSON.parse(processStdoutWriteSpy.mock.calls[0][0]);
        expect(json.message).toBe('Test');
      });

      it('should evaluate a lazy message when compact is false', () => {
        const logger = new ConsoleLogger({ json: true, compact: false });

        logger.log(() => 'lazy message');

        const json = convertInspectToJSON(
          processStdoutWriteSpy.mock.calls[0][0],
        );
        expect(json.message).toBe('lazy message');
      });
    });

    describe('errors', () => {
      const parseStderr = (index = 0) =>
        JSON.parse(processStderrWriteSpy.mock.calls[index][0]);

      it('should print a message and an error as one record with a structured error', () => {
        const logger = new ConsoleLogger('Ctx', { json: true });
        const error = new Error('boom');

        logger.error('Failed', error);

        expect(processStderrWriteSpy).toHaveBeenCalledOnce();
        const json = parseStderr();
        expect(json.level).toBe('error');
        expect(json.message).toBe('Failed');
        expect(json.context).toBe('Ctx');
        expect(json.stack).toBeUndefined();
        expect(json.error).toEqual({
          name: 'Error',
          message: 'boom',
          stack: error.stack,
        });
      });

      it('should keep an explicit context argument', () => {
        const logger = new ConsoleLogger({ json: true });

        logger.error('Failed', new TypeError('boom'), 'Explicit');

        expect(processStderrWriteSpy).toHaveBeenCalledOnce();
        const json = parseStderr();
        expect(json.context).toBe('Explicit');
        expect(json.error.name).toBe('TypeError');
      });

      it('should keep params next to the error', () => {
        const logger = new ConsoleLogger({ json: true });

        logger.error('Failed', new Error('boom'), { reqId: 'abc' });

        expect(processStderrWriteSpy).toHaveBeenCalledOnce();
        const json = parseStderr();
        expect(json.params).toEqual({ reqId: 'abc' });
        expect(json.error.message).toBe('boom');
      });

      it('should use the error message when the error is the message', () => {
        const logger = new ConsoleLogger({ json: true });
        const error = new RangeError('out of range');

        logger.error(error);

        expect(processStderrWriteSpy).toHaveBeenCalledOnce();
        const json = parseStderr();
        expect(json.message).toBe('out of range');
        expect(json.error).toEqual({
          name: 'RangeError',
          message: 'out of range',
          stack: error.stack,
        });
      });

      it('should structure an error passed to other levels', () => {
        const logger = new ConsoleLogger({ json: true });

        logger.warn('Retrying', new Error('timeout'));

        expect(processStdoutWriteSpy).toHaveBeenCalledOnce();
        const json = JSON.parse(processStdoutWriteSpy.mock.calls[0][0]);
        expect(json.message).toBe('Retrying');
        expect(json.error.message).toBe('timeout');
      });

      it('should include primitive own properties such as "code"', () => {
        const logger = new ConsoleLogger({ json: true });
        const error = Object.assign(new Error('refused'), {
          code: 'ECONNREFUSED',
          errno: -61,
          socket: { big: 'object' },
        });

        logger.error('Failed', error);

        const json = parseStderr();
        expect(json.error.code).toBe('ECONNREFUSED');
        expect(json.error.errno).toBe(-61);
        expect(json.error.socket).toBeUndefined();
      });

      it('should serialize the "cause" chain recursively', () => {
        const logger = new ConsoleLogger({ json: true });
        const root = new Error('root');
        const inner = new Error('inner', { cause: root });
        const outer = new Error('outer', { cause: inner });

        logger.error('Failed', outer);

        const json = parseStderr();
        expect(json.error.message).toBe('outer');
        expect(json.error.cause).toEqual({
          name: 'Error',
          message: 'inner',
          stack: inner.stack,
          cause: { name: 'Error', message: 'root', stack: root.stack },
        });
      });

      it('should keep a non-error "cause" as is', () => {
        const logger = new ConsoleLogger({ json: true });

        logger.error(
          'Failed',
          new Error('outer', { cause: { status: 503, retry: true } }),
        );

        const json = parseStderr();
        expect(json.error.cause).toEqual({ status: 503, retry: true });
      });

      it('should cap the "cause" chain depth', () => {
        const logger = new ConsoleLogger({ json: true });
        let error = new Error('level 0');
        for (let i = 1; i <= 20; i++) {
          error = new Error(`level ${i}`, { cause: error });
        }

        logger.error('Failed', error);

        const json = parseStderr();
        let depth = 0;
        let current = json.error;
        while (typeof current === 'object' && current.cause !== undefined) {
          current = current.cause;
          depth++;
        }
        expect(depth).toBeLessThan(20);
        expect(current).toBe('[Truncated]');
      });

      it('should not loop on a circular "cause" chain', () => {
        const logger = new ConsoleLogger({ json: true });
        const first = new Error('first');
        const second = new Error('second', { cause: first });
        (first as any).cause = second;

        expect(() => logger.error('Failed', first)).not.toThrow();

        const json = parseStderr();
        expect(json.error.cause.message).toBe('second');
        expect(json.error.cause.cause).toBe('[Circular]');
      });

      it('should serialize the errors of an AggregateError', () => {
        const logger = new ConsoleLogger({ json: true });
        const first = new Error('first');
        const aggregate = new AggregateError(
          [first, 'not an error'],
          'Several failed',
        );

        logger.error('Failed', aggregate);

        const json = parseStderr();
        expect(json.error.name).toBe('AggregateError');
        expect(json.error.message).toBe('Several failed');
        expect(json.error.errors).toEqual([
          { name: 'Error', message: 'first', stack: first.stack },
          'not an error',
        ]);
      });

      it('should keep the stack argument convention', () => {
        const logger = new ConsoleLogger({ json: true });
        const error = new Error('boom');

        logger.error(error.message, error.stack, 'Ctx');

        expect(processStderrWriteSpy).toHaveBeenCalledOnce();
        const json = parseStderr();
        expect(json.message).toBe('boom');
        expect(json.stack).toBe(error.stack);
        expect(json.context).toBe('Ctx');
        expect(json.error).toBeUndefined();
      });

      it('should structure the error when using compact: false', () => {
        const logger = new ConsoleLogger({ json: true, compact: false });

        logger.error('Failed', new Error('boom'));

        expect(processStderrWriteSpy).toHaveBeenCalledOnce();
        const output = processStderrWriteSpy.mock.calls[0][0];
        expect(output).toContain(`message: 'Failed'`);
        expect(output).toContain(`name: 'Error'`);
        expect(output).toContain(`message: 'boom'`);
      });

      it('should print one record through a "Logger" instance with a context', () => {
        const previousLoggerRef = Logger['staticInstanceRef'];
        Logger.overrideLogger(new ConsoleLogger({ json: true }));
        try {
          new Logger('Ctx').error('Failed', new Error('boom'));
        } finally {
          Logger.overrideLogger(previousLoggerRef!);
        }

        expect(processStderrWriteSpy).toHaveBeenCalledOnce();
        const json = parseStderr();
        expect(json.message).toBe('Failed');
        expect(json.context).toBe('Ctx');
        expect(json.error.message).toBe('boom');
      });

      it('should leave text mode output unchanged', () => {
        const logger = new ConsoleLogger({ colors: false });
        const error = new Error('boom');

        logger.error('Failed', error);

        expect(processStderrWriteSpy).toHaveBeenCalledTimes(2);
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain('Failed');
        expect(processStderrWriteSpy.mock.calls[1][0]).toContain('Error: boom');
      });
    });
  });

  describe('ConsoleLogger - fatal', () => {
    let processStdoutWriteSpy: ReturnType<typeof vi.fn>;
    let processStderrWriteSpy: ReturnType<typeof vi.fn>;
    const stack = 'Error: boom\n    at <anonymous>:1:1';

    beforeEach(() => {
      processStdoutWriteSpy = vi
        .spyOn(process.stdout, 'write')
        .mockImplementation(() => true);
      processStderrWriteSpy = vi
        .spyOn(process.stderr, 'write')
        .mockImplementation(() => true);
    });
    afterEach(() => {
      processStdoutWriteSpy.mockRestore();
      processStderrWriteSpy.mockRestore();
    });

    it('should print to stderr', () => {
      const logger = new ConsoleLogger({ colors: false });

      logger.fatal('shutting down', 'Ctx');

      expect(processStdoutWriteSpy).not.toHaveBeenCalled();
      expect(processStderrWriteSpy).toHaveBeenCalledOnce();
      expect(processStderrWriteSpy.mock.calls[0][0]).toContain(
        'FATAL [Ctx] shutting down',
      );
    });

    it('should print a stack argument like "error" does', () => {
      const logger = new ConsoleLogger({ colors: false });

      logger.fatal('shutting down', stack, 'Ctx');

      expect(processStdoutWriteSpy).not.toHaveBeenCalled();
      expect(processStderrWriteSpy).toHaveBeenCalledTimes(2);
      expect(processStderrWriteSpy.mock.calls[0][0]).toContain(
        '[Ctx] shutting down',
      );
      expect(processStderrWriteSpy.mock.calls[1][0]).toBe(`${stack}\n`);
    });

    it('should detect a stack passed as the only optional argument', () => {
      const logger = new ConsoleLogger({ colors: false });

      logger.fatal('shutting down', stack);

      expect(processStderrWriteSpy).toHaveBeenCalledTimes(2);
      expect(processStderrWriteSpy.mock.calls[1][0]).toBe(`${stack}\n`);
    });

    it('should include the stack in JSON mode', () => {
      const logger = new ConsoleLogger({ json: true });

      logger.fatal('shutting down', stack, 'Ctx');

      expect(processStdoutWriteSpy).not.toHaveBeenCalled();
      expect(processStderrWriteSpy).toHaveBeenCalledOnce();
      const json = JSON.parse(processStderrWriteSpy.mock.calls[0][0]);
      expect(json.level).toBe('fatal');
      expect(json.message).toBe('shutting down');
      expect(json.context).toBe('Ctx');
      expect(json.stack).toBe(stack);
    });

    it('should use console.error when forceConsole is true', () => {
      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {});
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      try {
        const logger = new ConsoleLogger({ forceConsole: true });

        logger.fatal('shutting down');

        expect(consoleLogSpy).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledOnce();
      } finally {
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
      }
    });

    it('should print to stderr through "Logger"', () => {
      Logger.fatal('static fatal');
      new Logger('Ctx').fatal('instance fatal', stack);

      expect(processStdoutWriteSpy).not.toHaveBeenCalled();
      expect(processStderrWriteSpy).toHaveBeenCalledTimes(3);
      expect(processStderrWriteSpy.mock.calls[0][0]).toContain('static fatal');
      expect(processStderrWriteSpy.mock.calls[1][0]).toContain('[Ctx]');
      expect(processStderrWriteSpy.mock.calls[1][0]).toContain(
        'instance fatal',
      );
      expect(processStderrWriteSpy.mock.calls[2][0]).toBe(`${stack}\n`);
    });
  });

  describe('log levels set at runtime', () => {
    let processStdoutWriteSpy: ReturnType<typeof vi.fn>;
    let processStderrWriteSpy: ReturnType<typeof vi.fn>;
    let previousStaticInstanceRef: LoggerService;
    let previousStaticLogLevels: LogLevel[] | undefined;
    let previousDefaultLoggerLevels: LogLevel[] | undefined;

    beforeEach(() => {
      processStdoutWriteSpy = vi
        .spyOn(process.stdout, 'write')
        .mockImplementation(() => true);
      processStderrWriteSpy = vi
        .spyOn(process.stderr, 'write')
        .mockImplementation(() => true);

      previousStaticInstanceRef = Logger['staticInstanceRef']!;
      previousStaticLogLevels = Logger['logLevels'];
      previousDefaultLoggerLevels = (previousStaticInstanceRef as any).options
        ?.logLevels;
      Logger['logLevels'] = undefined;
    });

    afterEach(() => {
      processStdoutWriteSpy.mockRestore();
      processStderrWriteSpy.mockRestore();

      Logger.overrideLogger(previousStaticInstanceRef);
      Logger['logLevels'] = previousStaticLogLevels;
      if (previousDefaultLoggerLevels) {
        previousStaticInstanceRef.setLogLevels!(previousDefaultLoggerLevels);
      }
    });

    describe('existing "Logger" instances', () => {
      it('should apply levels set with "overrideLogger" after they logged', () => {
        const logger = new Logger('Ctx');
        logger.log('before');
        expect(processStdoutWriteSpy).toHaveBeenCalledOnce();

        Logger.overrideLogger(['error']);
        logger.log('after');
        logger.error('still printed');

        expect(processStdoutWriteSpy).toHaveBeenCalledOnce();
        expect(processStderrWriteSpy).toHaveBeenCalledOnce();
        expect(processStderrWriteSpy.mock.calls[0][0]).toContain(
          'still printed',
        );
      });

      it('should apply every subsequent level change', () => {
        const logger = new Logger('Ctx');
        Logger.overrideLogger(['error']);
        logger.log('hidden');

        Logger.overrideLogger(['verbose']);
        logger.verbose('shown');

        expect(processStdoutWriteSpy).toHaveBeenCalledOnce();
        expect(processStdoutWriteSpy.mock.calls[0][0]).toContain('shown');
      });
    });

    describe('Logger.isLevelEnabled', () => {
      it('should report every level as enabled by default', () => {
        for (const level of [
          'verbose',
          'debug',
          'log',
          'warn',
          'error',
          'fatal',
        ] as LogLevel[]) {
          expect(Logger.isLevelEnabled(level)).toBe(true);
        }
      });

      it('should follow levels set with "overrideLogger"', () => {
        Logger.overrideLogger(['warn']);

        expect(Logger.isLevelEnabled('log')).toBe(false);
        expect(Logger.isLevelEnabled('warn')).toBe(true);
        expect(Logger.isLevelEnabled('error')).toBe(true);
      });

      it('should follow the levels of a "ConsoleLogger" set as the logger', () => {
        Logger.overrideLogger(new ConsoleLogger({ logLevels: ['error'] }));

        expect(Logger.isLevelEnabled('log')).toBe(false);
        expect(Logger.isLevelEnabled('error')).toBe(true);
      });

      it('should report every level as enabled for a custom logger', () => {
        Logger.overrideLogger({
          log: () => {},
          error: () => {},
          warn: () => {},
        });

        expect(Logger.isLevelEnabled('debug')).toBe(true);
      });

      it('should report no level as enabled when logging is disabled', () => {
        Logger.overrideLogger(false);

        expect(Logger.isLevelEnabled('error')).toBe(false);
      });
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
