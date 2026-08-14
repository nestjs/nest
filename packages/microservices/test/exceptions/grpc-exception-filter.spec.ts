import { EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { GrpcStatus } from '../../enums/grpc-status.enum.js';
import { GrpcAlreadyExistsException } from '../../exceptions/grpc-exception.js';
import { GrpcExceptionFilter } from '../../exceptions/grpc-exception-filter.js';
import { RpcException } from '../../exceptions/rpc-exception.js';

describe('GrpcExceptionFilter', () => {
  let filter: GrpcExceptionFilter;

  beforeEach(() => {
    filter = new GrpcExceptionFilter();
  });

  it('should serialize GrpcException instances to gRPC error objects', () =>
    new Promise<void>(done => {
      filter
        .catch(new GrpcAlreadyExistsException('email already exists'), null!)
        .pipe(
          catchError(err => {
            expect(err).toEqual({
              code: GrpcStatus.ALREADY_EXISTS,
              message: 'email already exists',
            });
            done();
            return EMPTY;
          }),
        )
        .subscribe(() => ({}));
    }));

  it('should serialize RpcException objects with code', () =>
    new Promise<void>(done => {
      filter
        .catch(
          new RpcException({
            code: GrpcStatus.INVALID_ARGUMENT,
            message: 'invalid input',
          }),
          null!,
        )
        .pipe(
          catchError(err => {
            expect(err).toEqual({
              code: GrpcStatus.INVALID_ARGUMENT,
              message: 'invalid input',
            });
            done();
            return EMPTY;
          }),
        )
        .subscribe(() => ({}));
    }));

  it('should serialize RpcException objects with status as code', () =>
    new Promise<void>(done => {
      filter
        .catch(
          new RpcException({
            status: GrpcStatus.ALREADY_EXISTS,
            message: 'email already exists',
          }),
          null!,
        )
        .pipe(
          catchError(err => {
            expect(err).toEqual({
              status: GrpcStatus.ALREADY_EXISTS,
              code: GrpcStatus.ALREADY_EXISTS,
              message: 'email already exists',
            });
            done();
            return EMPTY;
          }),
        )
        .subscribe(() => ({}));
    }));

  it('should serialize unknown exceptions to UNKNOWN', () =>
    new Promise<void>(done => {
      filter
        .catch(new Error('boom'), null!)
        .pipe(
          catchError(err => {
            expect(err).toEqual({
              code: GrpcStatus.UNKNOWN,
              message: 'Internal server error',
            });
            done();
            return EMPTY;
          }),
        )
        .subscribe(() => ({}));
    }));
});
