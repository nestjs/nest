import { RequestContextHost } from '../../context/request-context-host';
import { BaseRpcContext } from '../../ctx-host/base-rpc.context';

describe('RequestContextHost', () => {
  const data = { test: true };
  const pattern = 'test';
  const ctx = new BaseRpcContext([]);

  let ctxHost: RequestContextHost;
  beforeEach(() => {
    ctxHost = new RequestContextHost(pattern, data, ctx);
  });
  describe('getData', () => {
    it('should return "data" property', () => {
      expect(ctxHost.getData()).toEqual(data);
    });
  });
  describe('getContext', () => {
    it('should return "context" property', () => {
      expect(ctxHost.getContext()).toEqual(ctx);
    });
  });
  describe('getPattern', () => {
    it('should return "pattern" property', () => {
      expect(ctxHost.getPattern()).toEqual(pattern);
    });
  });
});
