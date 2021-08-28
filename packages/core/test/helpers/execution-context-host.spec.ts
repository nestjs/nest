import { ExecutionContextHost } from '../../helpers/execution-context-host';

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
      expect(typeof proxy.getData).toBe('function');
      expect(typeof proxy.getContext).toBe('function');
      expect(proxy.getData()).toEqual(args[0]);
      expect(proxy.getContext()).toEqual(args[1]);
    });
  });
  describe('switchToHttp', () => {
    it('should return http proxy', () => {
      const proxy = contextHost.switchToHttp();
      expect(typeof proxy.getRequest).toBe('function');
      expect(typeof proxy.getResponse).toBe('function');
      expect(typeof proxy.getNext).toBe('function');
      expect(proxy.getRequest()).toEqual(args[0]);
      expect(proxy.getResponse()).toEqual(args[1]);
      expect(proxy.getNext()).toEqual(args[2]);
    });
  });

  describe('switchToWs', () => {
    it('should return ws proxy', () => {
      const proxy = contextHost.switchToWs();
      expect(typeof proxy.getData).toBe('function');
      expect(typeof proxy.getClient).toBe('function');
      expect(proxy.getClient()).toEqual(args[0]);
      expect(proxy.getData()).toEqual(args[1]);
    });
  });
});
