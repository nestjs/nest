import { FastifyAdapter } from '../../adapters/fastify-adapter.js';

describe('FastifyAdapter async lifecycle hooks', () => {
  let adapter: FastifyAdapter;

  beforeEach(() => {
    adapter = new FastifyAdapter();
    adapter.get('/test', () => 'ok');
  });
  afterEach(async () => {
    await adapter.getInstance().close();
  });

  it('continues a request after an async onRequest hook resolves', async () => {
    let doneHook: ((err?: Error) => void) | undefined;
    adapter.setOnRequestHook(async (_request, _reply, done) => {
      // Retain a way to release the request even if this regression fails.
      doneHook = done;
      await Promise.resolve();
    });
    const pending = adapter.getInstance().inject('/test');
    const timeout = setTimeout(
      () => doneHook?.(new Error('Hook did not settle')),
      1000,
    );
    try {
      const response = await pending;
      expect(response.statusCode).toBe(200);
      expect(response.payload).toBe('ok');
    } finally {
      clearTimeout(timeout);
    }
  });

  it('routes a rejected onRequest hook through the Fastify error handler', async () => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    // A promise-returning function is sufficient; it need not be declared async.
    adapter.setOnRequestHook((_request, _reply, done) => {
      const promise = Promise.reject(new Error('Hook rejected'));
      // The adapter must forward this rejection to Fastify. Handle it separately
      // so the pre-fix regression cannot create an unhandled rejection.
      promise.catch(() => {});
      timeout = setTimeout(() => done(new Error('Hook did not settle')), 1000);
      return promise;
    });
    try {
      const response = await adapter.getInstance().inject('/test');
      expect(response.statusCode).toBe(500);
      expect(response.json().message).toBe('Hook rejected');
    } finally {
      clearTimeout(timeout);
    }
  });

  it('waits for a promise-returning onResponse hook to finish', async () => {
    let doneHook: ((err?: Error) => void) | undefined;
    let resolveHook!: () => void;
    const finished = new Promise<void>(resolve => {
      resolveHook = resolve;
    });
    adapter.setOnResponseHook(async (_request, _reply, done) => {
      doneHook = done;
      await Promise.resolve();
      resolveHook();
    });
    let subsequentHookCalled = false;
    adapter.getInstance().addHook('onResponse', (_request, _reply, done) => {
      subsequentHookCalled = true;
      done();
    });
    try {
      const response = await adapter.getInstance().inject('/test');
      await finished;
      expect(response.statusCode).toBe(200);
      await new Promise(resolve => setImmediate(resolve));
      expect(subsequentHookCalled).toBe(true);
    } finally {
      if (!subsequentHookCalled) doneHook?.();
    }
  });

  it('keeps callback hooks working', async () => {
    const requestHook = vi.fn((_request, _reply, done) => done());
    const responseHook = vi.fn((_request, _reply, done) => done());
    adapter.setOnRequestHook(requestHook);
    adapter.setOnResponseHook(responseHook);
    expect((await adapter.getInstance().inject('/test')).statusCode).toBe(200);
    expect(requestHook).toHaveBeenCalledOnce();
    expect(responseHook).toHaveBeenCalledOnce();
  });

  it('routes synchronous hook throws through the Fastify error handler', async () => {
    adapter.setOnRequestHook(() => {
      throw new Error('Synchronous hook failure');
    });
    const response = await adapter.getInstance().inject('/test');
    expect(response.statusCode).toBe(500);
    expect(response.json().message).toBe('Synchronous hook failure');
  });

  it('preserves the adapter as the callback hook receiver', async () => {
    const receivers: unknown[] = [];
    const hook = function (this: FastifyAdapter, _request, _reply, done) {
      receivers.push(this);
      done();
    };
    adapter.setOnRequestHook(hook);
    adapter.setOnResponseHook(hook);
    expect((await adapter.getInstance().inject('/test')).statusCode).toBe(200);
    expect(receivers).toEqual([adapter, adapter]);
  });

  it('preserves Fastify error handling when a hook rejects without an error', async () => {
    adapter.setOnRequestHook(() => Promise.reject());
    const response = await adapter.getInstance().inject('/test');
    expect(response.statusCode).toBe(500);
    expect(response.json().code).toBe('FST_ERR_SEND_UNDEFINED_ERR');
  });

  it('runs a POST handler once when an async onRequest hook also calls done', async () => {
    const handler = vi.fn(async () => {
      await new Promise(resolve => setImmediate(resolve));
      return 'created';
    });
    adapter.post('/create', handler);
    adapter.setOnRequestHook(async (_request, _reply, done) => {
      await Promise.resolve();
      done();
    });
    const response = await adapter
      .getInstance()
      .inject({ method: 'POST', url: '/create' });
    await new Promise(resolve => setImmediate(resolve));
    expect(response.statusCode).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('runs subsequent onResponse hooks once when an async hook also calls done', async () => {
    await adapter.close();
    const logger = {
      level: 'info',
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      fatal: vi.fn(),
      silent: vi.fn(),
      child() {
        return this;
      },
    };
    adapter = new FastifyAdapter({ loggerInstance: logger });
    adapter.get('/test', () => 'ok');
    adapter.setOnResponseHook(async (_request, _reply, done) => {
      await Promise.resolve();
      done();
    });
    const subsequentHook = vi.fn((_request, _reply, done) => done());
    adapter.getInstance().addHook('onResponse', subsequentHook);
    expect((await adapter.getInstance().inject('/test')).statusCode).toBe(200);
    await new Promise(resolve => setImmediate(resolve));
    expect(subsequentHook).toHaveBeenCalledOnce();
    expect(
      logger.info.mock.calls.filter(
        ([, message]) => message === 'request completed',
      ),
    ).toHaveLength(1);
  });

  it('ignores repeated done calls from a callback hook', async () => {
    const handler = vi.fn(async () => {
      await new Promise(resolve => setImmediate(resolve));
      return 'ok';
    });
    adapter.get('/once', handler);
    adapter.setOnRequestHook((_request, _reply, done) => {
      done();
      done();
    });
    expect((await adapter.getInstance().inject('/once')).statusCode).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('ignores a late done after the hook promise has settled', async () => {
    let doneHook!: (err?: Error) => void;
    const handler = vi.fn(async () => {
      await new Promise(resolve => setImmediate(resolve));
      return 'ok';
    });
    adapter.get('/once', handler);
    adapter.setOnRequestHook(async (_request, _reply, done) => {
      doneHook = done;
    });
    expect((await adapter.getInstance().inject('/once')).statusCode).toBe(200);
    doneHook();
    expect(handler).toHaveBeenCalledOnce();
  });

  it('handles a promise rejection after done without continuing again', async () => {
    const handler = vi.fn(() => 'ok');
    adapter.get('/once', handler);
    adapter.setOnRequestHook(async (_request, _reply, done) => {
      done();
      throw new Error('Late rejection');
    });
    const errorHandler = vi.fn((_error, _request, reply) =>
      reply.code(500).send('error'),
    );
    adapter.getInstance().setErrorHandler(errorHandler);
    expect((await adapter.getInstance().inject('/once')).statusCode).toBe(200);
    await new Promise(resolve => setImmediate(resolve));
    expect(handler).toHaveBeenCalledOnce();
    expect(errorHandler).not.toHaveBeenCalled();
  });
});
