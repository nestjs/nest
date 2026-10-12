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
        .expect(500, error?.message ?? 'Rejected promise');
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

  it('does not advance again when an async request hook calls done', async () => {
    adapter.setOnRequestHook(async (_req, _res, done) => {
      await Promise.resolve();
      done();
    });
    const afterRoute = vi.fn((_req, res) => res.status(500).end());
    adapter.getInstance().use(afterRoute);

    await request(adapter.getInstance()).get('/test').expect(200, 'ok');
    await new Promise(resolve => setImmediate(resolve));
    expect(afterRoute).not.toHaveBeenCalled();
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

  it('forwards a request hook rejection after done to the error handler', async () => {
    const error = new Error('Late rejection');
    adapter.setOnRequestHook((_req, _res, done) => {
      done();
      const result = Promise.reject(error);
      result.catch(() => {});
      return result;
    });
    const errorHandler = vi.fn<ErrorRequestHandler>(
      (_err, _req, _res, _next) => {},
    );
    adapter.getInstance().use(errorHandler);

    await request(adapter.getInstance()).get('/test').expect(200, 'ok');
    await new Promise(resolve => setImmediate(resolve));
    expect(errorHandler).toHaveBeenCalledOnce();
    expect(errorHandler.mock.calls[0][0]).toBe(error);
    expect(errorHandler.mock.calls[0][2].headersSent).toBe(true);
  });

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
