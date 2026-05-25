import { GrpcStatus } from '../../enums/grpc-status.enum.js';
import {
  GrpcAlreadyExistsException,
  GrpcException,
} from '../../exceptions/grpc-exception.js';

describe('GrpcException', () => {
  it('should expose gRPC status code and error body', () => {
    const exception = new GrpcException(
      'resource already exists',
      GrpcStatus.ALREADY_EXISTS,
    );

    expect(exception.message).toBe('resource already exists');
    expect(exception.getCode()).toBe(GrpcStatus.ALREADY_EXISTS);
    expect(exception.getError()).toEqual({
      code: GrpcStatus.ALREADY_EXISTS,
      message: 'resource already exists',
    });
  });

  it('should use status-specific exception defaults', () => {
    const exception = new GrpcAlreadyExistsException();

    expect(exception.getError()).toEqual({
      code: GrpcStatus.ALREADY_EXISTS,
      message: 'Already exists',
    });
  });
});
