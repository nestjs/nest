import { Logger } from '@nestjs/common';
import type { ErrorRequestHandler } from 'express';
import request from 'supertest';
import { ExpressAdapter } from '../../adapters/express-adapter.js';

describe('ExpressAdapter async lifecycle hooks', () => {
  let adapter: ExpressAdapter;

  beforeEach(() => {
    adapter = new ExpressAdapter();
    adapter.get('/test', (_req, res) => res.send('ok'));
  });

  afterEach(() => vi.restoreAllMocks());

  it.each([new Error('Hook rejected'), undefined])(
    'forwards a rejected request hook to the error handler (%s)',
    async error => {
      adapter.setOnRequestHook(() => {
        const result = Promise.reject(error);
        // Keep the unfixed adapter from causing an unhandled rejection.
        result.catch(() => {});
        return result;
      });
      const errorHandler = vi.fn<ErrorRequestHandler>(
        (err, _req, res, _next) => {
          res.status(500).send(err.message);
        },
      );
      adapter.getInstance().use(errorHandler);

      await request(adapter.getInstance())
        .get('/test')
        .timeout(2000)
        .expect(500, error?.message ?? 'Request hook failed');
      expect(errorHandler).toHaveBeenCalledOnce();
    },
  );

  it('forwards synchronous request hook errors', async () => {
    const error = new Error('Synchronous hook failure');
    adapter.setOnRequestHook(() => {
      throw error;
    });
    const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
      res.status(500).send(err.message);
    };
    adapter.getInstance().use(errorHandler);

    await request(adapter.getInstance())
      .get('/test')
      .expect(500, error.message);
  });

  it('ignores done after a request hook has already failed', async () => {
    const error = new Error('Hook rejected');
    let continueRequest!: () => void;
    adapter.setOnRequestHook((_req, _res, done) => {
      continueRequest = done;
      return Promise.reject(error);
    });
    const handler = vi.fn((_req, res) => res.send('unexpected'));
    adapter.get('/failed', handler);
    const errorHandler = vi.fn<ErrorRequestHandler>((err, _req, res, _next) => {
      res.status(500).send(err.message);
    });
    adapter.getInstance().use(errorHandler);
    const afterError = vi.fn((_req, res) => res.end());
    adapter.getInstance().use(afterError);

    await request(adapter.getInstance())
      .get('/failed')
      .timeout(2000)
      .expect(500, error.message);
    continueRequest();

    expect(handler).not.toHaveBeenCalled();
    expect(afterError).not.toHaveBeenCalled();
    expect(errorHandler).toHaveBeenCalledOnce();
  });

  it('keeps the adapter as the receiver of callback hooks', async () => {
    const receivers: unknown[] = [];
    adapter.setOnRequestHook(function (this: ExpressAdapter, _req, _res, done) {
      receivers.push(this);
      done();
    });
    adapter.setOnResponseHook(function (this: ExpressAdapter) {
      receivers.push(this);
    });

    await request(adapter.getInstance()).get('/test').expect(200, 'ok');
    expect(receivers).toEqual([adapter, adapter]);
  });

  it('waits for done even after the request hook promise resolves', async () => {
    let continueRequest: (() => void) | undefined;
    let notifyHook!: () => void;
    const hookCalled = new Promise<void>(resolve => {
      notifyHook = resolve;
    });
    adapter.setOnRequestHook(async (_req, _res, done) => {
      continueRequest = done;
      notifyHook();
    });
    const handler = vi.fn((_req, res) => res.send('delayed'));
    adapter.get('/delayed', handler);
    const response = request(adapter.getInstance())
      .get('/delayed')
      .timeout(2000)
      .expect(200, 'delayed')
      .then(result => result);

    try {
      await hookCalled;
      await new Promise(resolve => setImmediate(resolve));
      expect(handler).not.toHaveBeenCalled();
    } finally {
      continueRequest?.();
      await response;
    }
    expect(handler).toHaveBeenCalledOnce();
  });

  it.each(['throw', 'reject', 'done twice'])(
    'keeps an asynchronous route running after the hook completes (%s)',
    async completion => {
      const error = new Error('Late hook failure');
      const logError = vi
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});
      adapter.setOnRequestHook((_req, _res, done) => {
        done();
        if (completion === 'done twice') {
          done();
        } else if (completion === 'throw') {
          throw error;
        } else {
          return Promise.reject(error);
        }
      });
      let finishRoute!: () => void;
      const routeFinished = new Promise<void>(resolve => {
        finishRoute = resolve;
      });
      const handler = vi.fn(async (_req, res) => {
        try {
          await new Promise(resolve => setImmediate(resolve));
          res.send('ok');
        } finally {
          finishRoute();
        }
      });
      adapter.get('/delayed', handler);
      const notFound = vi.fn((_req, res) => res.status(404).end());
      adapter.getInstance().use(notFound);
      const errorHandler = vi.fn<ErrorRequestHandler>(
        (err, _req, res, _next) => {
          if (!res.headersSent) {
            res.status(500).send(err.message);
          }
        },
      );
      adapter.getInstance().use(errorHandler);

      const response = await request(adapter.getInstance())
        .get('/delayed')
        .timeout(2000);
      await routeFinished;
      await new Promise(resolve => setImmediate(resolve));

      expect(response.status).toBe(200);
      expect(response.text).toBe('ok');
      expect(handler).toHaveBeenCalledOnce();
      expect(notFound).not.toHaveBeenCalled();
      expect(errorHandler).not.toHaveBeenCalled();
      if (completion === 'done twice') {
        expect(logError).not.toHaveBeenCalled();
      } else {
        expect(logError).toHaveBeenCalledExactlyOnceWith(error);
      }
    },
  );

  it.each(['throw', 'reject'])(
    'logs response hook errors after sending the response (%s)',
    async failure => {
      const error = new Error('Response hook failed');
      const logError = vi
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});
      adapter.setOnResponseHook(() => {
        if (failure === 'throw') {
          throw error;
        }
        const result = Promise.reject(error);
        result.catch(() => {});
        return result;
      });

      await request(adapter.getInstance()).get('/test').expect(200, 'ok');
      await new Promise(resolve => setImmediate(resolve));
      expect(logError).toHaveBeenCalledExactlyOnceWith(error);
    },
  );
});
