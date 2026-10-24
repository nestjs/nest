import { Logger } from '@nestjs/common';
import { CloudflareAdapter } from '@nestjs/platform-cloudflare';
import { EventEmitter } from 'events';
import { createServer } from 'http';

describe('CloudflareAdapter', () => {
  let adapter: CloudflareAdapter;

  beforeEach(() => {
    adapter = new CloudflareAdapter();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await adapter.close();
  });

  it('should identify itself as Express', () => {
    expect(adapter.getType()).toBe('express');
  });

  describe('initHttpServer', () => {
    it('should warn about and ignore "httpsOptions"', () => {
      const warn = vi
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => {});

      adapter.initHttpServer({ httpsOptions: { key: 'key', cert: 'cert' } });

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('"httpsOptions" is ignored'),
      );
      expect(adapter.getHttpServer()).not.toHaveProperty('setSecureContext');
    });

    it('should warn about and ignore "forceCloseConnections"', () => {
      const warn = vi
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => {});

      adapter.initHttpServer({ forceCloseConnections: true });

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('"forceCloseConnections" is ignored'),
      );
      // A plain server only has the listener that Node.js registers itself
      expect(adapter.getHttpServer().listenerCount('connection')).toBe(
        createServer().listenerCount('connection'),
      );
    });

    it('should keep the other options', () => {
      adapter.initHttpServer({ return503OnClosing: true });
      adapter.beforeClose();

      const res = {
        set: vi.fn(),
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      };
      const stack = adapter.getInstance().router.stack;
      stack[stack.length - 1].handle({}, res, vi.fn());

      expect(res.status).toHaveBeenCalledWith(503);
    });
  });

  describe('listen', () => {
    it('should listen on the port only, and report it', async () => {
      adapter.initHttpServer({});
      const listen = vi.spyOn(adapter.getHttpServer(), 'listen');

      await new Promise<void>(resolve =>
        adapter.listen('0', '0.0.0.0', resolve),
      );

      expect(listen).toHaveBeenCalledWith(0, expect.any(Function));
      expect(adapter.getPort()).toEqual(expect.any(Number));
      expect(adapter.getPort()).toBeGreaterThan(0);
    });

    it('should not report a port before listening', () => {
      adapter.initHttpServer({});

      expect(adapter.getPort()).toBeUndefined();
    });
  });

  describe('socket bridge', () => {
    const runBridge = (socket: object) => {
      const res = new EventEmitter();
      const next = vi.fn();
      // The bridge is registered right after the hook middleware of the
      // Express adapter
      const layer = adapter.getInstance().router.stack[1];
      layer.handle({ socket }, res, next);
      return { res, next };
    };

    it('should add no-op tuning methods to an emulated socket', () => {
      const socket = Object.assign(new EventEmitter(), {
        remoteAddress: '127.0.0.1',
      });

      const { next } = runBridge(socket);

      expect(next).toHaveBeenCalled();
      expect((socket as any).setKeepAlive(true)).toBe(socket);
      expect((socket as any).setNoDelay(true)).toBe(socket);
      expect((socket as any).setTimeout(0)).toBe(socket);
    });

    it('should close an emulated socket once, when the response closes', () => {
      const socket = new EventEmitter();
      const onClose = vi.fn();
      socket.on('close', onClose);

      const { res } = runBridge(socket);
      res.emit('close');
      res.emit('close');

      expect(onClose).toHaveBeenCalledTimes(1);
      expect((socket as any).destroyed).toBe(true);
    });

    it('should leave a Node.js socket untouched', () => {
      const setKeepAlive = vi.fn();
      const socket = Object.assign(new EventEmitter(), { setKeepAlive });
      const onClose = vi.fn();
      socket.on('close', onClose);

      const { res } = runBridge(socket);
      res.emit('close');

      expect(socket.setKeepAlive).toBe(setKeepAlive);
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
