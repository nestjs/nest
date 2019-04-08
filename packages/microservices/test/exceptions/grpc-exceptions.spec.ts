import * as sinon from 'sinon';
import { expect } from 'chai';
import {
  GrpcException,
  GrpcAlreadyExistException,
} from '../../exceptions/grpc-exceptions';
import { GrpcStatus } from '../../enums/grpc-status.enum';

describe('GrpcException', () => {
  let instance: GrpcException;
  const code = GrpcStatus.ALREADY_EXISTS;
  const error = 'test';
  beforeEach(() => {
    instance = new GrpcException(code, error);
  });
  it('should returns error message or object', () => {
    expect(instance.getError()).to.be.eql(error);
    expect(new GrpcAlreadyExistException(error).code).to.be.equal(code);
  });
});
