import { ConsoleLogger, Logger, LoggerService } from '@nestjs/common';
import { CapturingLogger } from '../services/capturing-logger.service.js';

describe('CapturingLogger', () => {
  let logger: CapturingLogger;
  let processStdoutWriteSpy: ReturnType<typeof vi.fn>;
  let processStderrWriteSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    logger = new CapturingLogger();
    processStdoutWriteSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    processStderrWriteSpy = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('should be a ConsoleLogger', () => {
    expect(logger).toBeInstanceOf(ConsoleLogger);
  });

  describe('capturing', () => {
    it('should record every level with its structured data', () => {
      logger.verbose('verbose message');
      logger.debug('debug message', 'Ctx');
      logger.log('Order created', { orderId: 1 }, { userId: 2 }, 'Orders');
      logger.warn({ retries: 3 });

      expect(logger.entries).toEqual([
        {
          level: 'verbose',
          message: 'verbose message',
          args: ['verbose message'],
        },
        {
          level: 'debug',
          message: 'debug message',
          context: 'Ctx',
          args: ['debug message', 'Ctx'],
        },
        {
          level: 'log',
          message: 'Order created',
          context: 'Orders',
          params: { orderId: 1, userId: 2 },
          args: ['Order created', { orderId: 1 }, { userId: 2 }, 'Orders'],
        },
        { level: 'warn', message: { retries: 3 }, args: [{ retries: 3 }] },
      ]);
    });

    it('should record an error passed after the message', () => {
      const error = new Error('Payment failed');

      logger.error('Checkout failed', error, 'Checkout');

      expect(logger.entries[0]).toMatchObject({
        level: 'error',
        message: 'Checkout failed',
        context: 'Checkout',
        error,
      });
    });

    it('should use the message of an error logged as the message', () => {
      const error = new Error('Payment failed');

      logger.error(error);

      expect(logger.entries[0]).toMatchObject({
        message: 'Payment failed',
        error,
      });
    });

    it('should record a stack passed as a string', () => {
      const stack = 'Error: boom\n    at run (app.ts:1:1)';

      logger.error('boom', stack, 'App');
      logger.fatal('fatal boom', stack);

      expect(logger.entries[0]).toMatchObject({
        message: 'boom',
        stack,
        context: 'App',
      });
      expect(logger.entries[1]).toMatchObject({
        level: 'fatal',
        message: 'fatal boom',
        stack,
      });
    });

    it('should evaluate lazy messages', () => {
      logger.debug(() => 'expensive');

      expect(logger.entries[0].message).toBe('expensive');
    });

    it('should not print by default', () => {
      logger.log('message');
      logger.error('message');

      expect(processStdoutWriteSpy).not.toHaveBeenCalled();
      expect(processStderrWriteSpy).not.toHaveBeenCalled();
    });

    it('should also print when "print" is enabled', () => {
      logger = new CapturingLogger({ print: true, json: true });

      logger.log('Order created', { orderId: 1 }, 'Orders');
      logger.error('Failed', new Error('boom'));

      expect(logger.entries).toHaveLength(2);
      expect(JSON.parse(processStdoutWriteSpy.mock.calls[0][0])).toMatchObject({
        level: 'log',
        message: 'Order created',
        context: 'Orders',
        params: { orderId: 1 },
      });
      expect(JSON.parse(processStderrWriteSpy.mock.calls[0][0])).toMatchObject({
        level: 'error',
        message: 'Failed',
        error: { message: 'boom' },
      });
    });

    it('should print a stack passed as a string in text mode', () => {
      logger = new CapturingLogger({ print: true, colors: false });
      const stack = 'Error: boom\n    at run (app.ts:1:1)';

      logger.error('boom', stack, 'App');

      expect(processStderrWriteSpy).toHaveBeenCalledTimes(2);
      expect(processStderrWriteSpy.mock.calls[0][0]).toContain('[App] boom');
      expect(processStderrWriteSpy.mock.calls[1][0]).toBe(`${stack}\n`);
    });

    it('should evaluate a lazy message once when printing', () => {
      logger = new CapturingLogger({ print: true, json: true });
      const message = vi.fn(() => 'expensive');

      logger.debug(message);

      expect(message).toHaveBeenCalledOnce();
      expect(logger.entries[0].message).toBe('expensive');
      expect(JSON.parse(processStdoutWriteSpy.mock.calls[0][0]).message).toBe(
        'expensive',
      );
    });

    it('should only capture the given levels', () => {
      logger = new CapturingLogger({ logLevels: ['warn'] });

      logger.log('hidden');
      logger.warn('shown');
      logger.error('shown');

      expect(logger.entries.map(entry => entry.level)).toEqual([
        'warn',
        'error',
      ]);
    });

    it('should capture every level regardless of NEST_LOG_LEVEL', () => {
      vi.stubEnv('NEST_LOG_LEVEL', 'error');
      logger = new CapturingLogger();

      logger.debug('captured');

      expect(logger.entries).toHaveLength(1);
    });

    it('should return a snapshot of the entries', () => {
      logger.log('first');
      const entries = logger.entries;
      logger.log('second');

      expect(entries).toHaveLength(1);
      expect(logger.entries).toHaveLength(2);
    });

    it('should remove the entries on "clear"', () => {
      logger.log('message');
      logger.clear();

      expect(logger.entries).toEqual([]);
    });
  });

  describe('queries', () => {
    beforeEach(() => {
      logger.log('Mapped {/orders, GET} route', 'RouterExplorer');
      logger.log('Order created', { orderId: 1, items: [1, 2] }, 'Orders');
      logger.warn('Retrying payment (attempt 2)', 'Payments');
      logger.error('Payment failed', new Error('declined'), 'Payments');
    });

    it('should filter by level', () => {
      expect(logger.filter({ level: 'log' })).toHaveLength(2);
    });

    it('should match a string context exactly', () => {
      expect(logger.filter({ context: 'Payments' })).toHaveLength(2);
      expect(logger.filter({ context: 'Payment' })).toHaveLength(0);
    });

    it('should match a context against a regular expression', () => {
      expect(logger.filter({ context: /^Pay/ })).toHaveLength(2);
    });

    it('should match a string message as a substring', () => {
      expect(logger.filter({ message: 'Retrying' })).toHaveLength(1);
      expect(logger.filter({ message: 'PAYMENT' })).toHaveLength(0);
    });

    it('should match a message against a regular expression', () => {
      expect(logger.filter({ message: /payment/i })).toHaveLength(2);
      const global = /Order/g;
      expect(logger.filter({ message: global })).toHaveLength(1);
      expect(logger.filter({ message: global })).toHaveLength(1);
    });

    it('should match params that are deeply equal', () => {
      expect(logger.filter({ params: { orderId: 1 } })).toHaveLength(1);
      expect(logger.filter({ params: { items: [1, 2] } })).toHaveLength(1);
      expect(logger.filter({ params: { orderId: '1' } })).toHaveLength(0);
    });

    it('should combine the criteria', () => {
      expect(
        logger.filter({ level: 'error', context: 'Payments' }),
      ).toHaveLength(1);
      expect(logger.filter({ level: 'log', context: 'Payments' })).toEqual([]);
    });

    it('should accept a predicate', () => {
      expect(
        logger.filter(entry => entry.error?.message === 'declined'),
      ).toHaveLength(1);
    });

    it('should return every entry without a matcher', () => {
      expect(logger.filter()).toHaveLength(4);
    });

    it('should find the first matching entry', () => {
      expect(logger.find({ context: 'Payments' })?.level).toBe('warn');
      expect(logger.find({ context: 'Unknown' })).toBeUndefined();
    });

    describe('assertLogged', () => {
      it('should return the first matching entry', () => {
        const entry = logger.assertLogged({ level: 'error' });

        expect(entry.error?.message).toBe('declined');
      });

      it('should throw an error listing the entries when nothing matches', () => {
        let error: Error | undefined;
        try {
          logger.assertLogged({ level: 'error', context: 'Orders' });
        } catch (e) {
          error = e as Error;
        }

        expect(error).toBeInstanceOf(Error);
        expect(error!.message).toBe(
          [
            "Expected a log entry matching { level: 'error', context: 'Orders' }, but none of the 4 captured entries matched.",
            'Captured entries:',
            '  LOG [RouterExplorer] Mapped {/orders, GET} route',
            '  LOG [Orders] Order created { orderId: 1, items: [ 1, 2 ] }',
            '  WARN [Payments] Retrying payment (attempt 2)',
            '  ERROR [Payments] Payment failed',
          ].join('\n'),
        );
      });

      it('should describe a predicate', () => {
        expect(() => logger.assertLogged(() => false)).toThrow(
          'Expected a log entry matching the predicate',
        );
      });

      it('should say when nothing was captured', () => {
        logger.clear();

        expect(() => logger.assertLogged({ level: 'log' })).toThrow(
          "Expected a log entry matching { level: 'log' }, but none of the 0 captured entries matched.",
        );
      });
    });

    describe('assertNotLogged', () => {
      it('should pass when nothing matches', () => {
        expect(() => logger.assertNotLogged({ level: 'fatal' })).not.toThrow();
      });

      it('should throw an error listing the matching entries', () => {
        expect(() => logger.assertNotLogged({ context: 'Payments' })).toThrow(
          [
            "Expected no log entry matching { context: 'Payments' }, but 2 matched.",
            'Captured entries:',
            '  WARN [Payments] Retrying payment (attempt 2)',
            '  ERROR [Payments] Payment failed',
          ].join('\n'),
        );
      });
    });

    it('should list the last 50 entries only', () => {
      logger.clear();
      for (let i = 0; i < 60; i++) {
        logger.log(`message ${i}`);
      }

      expect(() => logger.assertLogged({ level: 'error' })).toThrow(
        '(10 earlier entries omitted)\n  LOG message 10',
      );
    });
  });

  describe('as the application logger', () => {
    let previousLogger: LoggerService | undefined;

    beforeEach(() => {
      previousLogger = Logger['staticInstanceRef'];
    });

    afterEach(() => {
      Logger.overrideLogger(previousLogger ?? false);
    });

    it('should capture "Logger" instances, including ones that already logged', () => {
      const serviceLogger = new Logger('OrdersService');
      serviceLogger.log('before the override');

      Logger.overrideLogger(logger);
      serviceLogger.log('Order created', { orderId: 1 });
      serviceLogger.error('Order failed', new Error('boom'));
      Logger.warn('static', 'Static');

      expect(logger.entries).toMatchObject([
        {
          level: 'log',
          message: 'Order created',
          context: 'OrdersService',
          params: { orderId: 1 },
        },
        {
          level: 'error',
          message: 'Order failed',
          context: 'OrdersService',
          error: { message: 'boom' },
        },
        { level: 'warn', message: 'static', context: 'Static' },
      ]);
    });

    it('should capture errors logged by a "Logger" instance without a stack', () => {
      Logger.overrideLogger(logger);

      new Logger('OrdersService').error('Order failed');

      expect(logger.entries).toEqual([
        {
          level: 'error',
          message: 'Order failed',
          context: 'OrdersService',
          args: ['Order failed', undefined, 'OrdersService'],
        },
      ]);
    });

    it('should report its levels through "Logger.isLevelEnabled"', () => {
      Logger.overrideLogger(new CapturingLogger({ logLevels: ['warn'] }));

      expect(Logger.isLevelEnabled('log')).toBe(false);
      expect(Logger.isLevelEnabled('warn')).toBe(true);
    });
  });
});
