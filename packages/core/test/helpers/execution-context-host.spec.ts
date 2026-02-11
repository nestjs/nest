import { ExecutionContextHost } from '../../helpers/execution-context-host.js';

describe('ExecutionContextHost', () => {
  let contextHost: ExecutionContextHost;

  const args = ['test', 'test2', 'test3'],
    constructorRef = { test: 'test' },
    callback = () => null;

  beforeEach(() => {
    contextHost = new ExecutionContextHost(
      args,
      constructorRef as any,
      callback,
    );
  });

  describe('getClass', () => {
    it('should return constructorRef', () => {
      expect(contextHost.getClass()).toEqual(constructorRef);
    });
  });

  describe('getHandler', () => {
    it('should return handler', () => {
      expect(contextHost.getHandler()).toEqual(callback);
    });
  });

  describe('getArgs', () => {
    it('should return args', () => {
      expect(contextHost.getArgs()).toEqual(args);
    });
  });

  describe('getArgByIndex', () => {
    it('should return argument by index', () => {
      expect(contextHost.getArgByIndex(0)).toEqual(args[0]);
    });
  });

  describe('switchToRpc', () => {
    it('should return rpc proxy', () => {
      const proxy = contextHost.switchToRpc();
      expect(proxy.getData).toBeTypeOf('function');
      expect(proxy.getContext).toBeTypeOf('function');
      expect(proxy.getData()).toBe(args[0]);
      expect(proxy.getContext()).toBe(args[1]);
    });
  });

  describe('switchToHttp', () => {
    it('should return http proxy', () => {
      const proxy = contextHost.switchToHttp();
      expect(proxy.getRequest).toBeTypeOf('function');
      expect(proxy.getResponse).toBeTypeOf('function');
      expect(proxy.getNext).toBeTypeOf('function');
      expect(proxy.getRequest()).toBe(args[0]);
      expect(proxy.getResponse()).toBe(args[1]);
      expect(proxy.getNext()).toBe(args[2]);
    });
  });

  describe('switchToWs', () => {
    it('should return ws proxy', () => {
      const proxy = contextHost.switchToWs();
      expect(proxy.getData).toBeTypeOf('function');
      expect(proxy.getClient).toBeTypeOf('function');
      expect(proxy.getClient()).toBe(args[0]);
      expect(proxy.getData()).toBe(args[1]);
    });
  });
});
