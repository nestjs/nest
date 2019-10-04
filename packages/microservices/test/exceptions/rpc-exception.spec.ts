import * as sinon from 'sinon';
import { expect } from 'chai';
import { RpcException } from '../../exceptions/rpc-exception';

describe('RpcException', () => {
  let instance: RpcException;
  const error = 'test';
  beforeEach(() => {
    instance = new RpcException(error);
  });
  it('should returns error message or object', () => {
    expect(instance.getError()).to.be.eql(error);
  });

  it('should serialize', () => {
    expect(`${instance}`.includes(error)).to.be.true;
    const obj = { foo: 'bar' };
    expect(`${new RpcException(obj)}`.includes(JSON.stringify(obj))).to.be.true;
  });
});
