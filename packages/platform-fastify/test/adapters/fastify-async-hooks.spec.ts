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
      // The adapter must return this promise to Fastify. Handle it separately
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
});
