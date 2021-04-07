import { expect } from 'chai';

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
      expect(contextHost.getClass()).to.be.eql(constructorRef);
    });
  });

  describe('getHandler', () => {
    it('should return handler', () => {
      expect(contextHost.getHandler()).to.be.eql(callback);
    });
  });

  describe('getArgs', () => {
    it('should return args', () => {
      expect(contextHost.getArgs()).to.be.eql(args);
    });
  });

  describe('getArgByIndex', () => {
    it('should return argument by index', () => {
      expect(contextHost.getArgByIndex(0)).to.be.eql(args[0]);
    });
  });

  describe('switchToRpc', () => {
    it('should return rpc proxy', () => {
      const proxy = contextHost.switchToRpc();
      expect(proxy.getData).to.be.a('function');
      expect(proxy.getContext).to.be.a('function');
      expect(proxy.getData()).to.be.eq(args[0]);
      expect(proxy.getContext()).to.be.eq(args[1]);
    });
  });

  describe('switchToHttp', () => {
    it('should return http proxy', () => {
      const proxy = contextHost.switchToHttp();
      expect(proxy.getRequest).to.be.a('function');
      expect(proxy.getResponse).to.be.a('function');
      expect(proxy.getNext).to.be.a('function');
      expect(proxy.getRequest()).to.be.eq(args[0]);
      expect(proxy.getResponse()).to.be.eq(args[1]);
      expect(proxy.getNext()).to.be.eq(args[2]);
    });
  });

  describe('switchToWs', () => {
    it('should return ws proxy', () => {
      const proxy = contextHost.switchToWs();
      expect(proxy.getData).to.be.a('function');
      expect(proxy.getClient).to.be.a('function');
      expect(proxy.getClient()).to.be.eq(args[0]);
      expect(proxy.getData()).to.be.eq(args[1]);
    });
  });
});
