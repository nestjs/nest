import { expect } from 'chai';

import { BaseRpcContext } from '../../ctx-host/base-rpc.context';

describe('BaseRpcContext', () => {
  const args = [1, 2, 3];
  let rpcContext: BaseRpcContext;

  beforeEach(() => {
    rpcContext = new BaseRpcContext(args);
  });
  describe('getArgs', () => {
    it('should return "args" array', () => {
      expect(rpcContext.getArgs()).to.be.eql(args);
    });
  });
  describe('getArgByIndex', () => {
    it('should return argument by index', () => {
      expect(rpcContext.getArgByIndex(0)).to.be.eql(args[0]);
      expect(rpcContext.getArgByIndex(1)).to.be.eql(args[1]);
      expect(rpcContext.getArgByIndex(2)).to.be.eql(args[2]);
    });
  });
});
