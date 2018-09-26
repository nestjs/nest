import * as sinon from 'sinon';
import { expect } from 'chai';
import { RpcException } from '@nestjs/microservices/exceptions/rpc-exception';

describe('RpcException', () => {
  let instance: RpcException;
  const error = 'test';
  beforeEach(() => {
    instance = new RpcException(error);
  });
  it('should returns error message or object', () => {
    expect(instance.getError()).to.be.eql(error);
  });
});
