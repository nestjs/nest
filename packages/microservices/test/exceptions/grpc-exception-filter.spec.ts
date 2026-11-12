import { HttpException } from '@nestjs/common';
import { EMPTY, lastValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { GrpcStatus } from '../../enums/grpc-status.enum.js';
import { GrpcAlreadyExistsException } from '../../exceptions/grpc-exception.js';
import { GrpcExceptionFilter } from '../../exceptions/grpc-exception-filter.js';
import { KafkaRetriableException } from '../../exceptions/kafka-retriable-exception.js';
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

  describe('when an RpcException holds an error', () => {
    let loggerErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      loggerErrorSpy = vi
        .spyOn((GrpcExceptionFilter as any).logger, 'error')
        .mockImplementation(() => undefined);
    });
    afterEach(() => {
      loggerErrorSpy.mockRestore();
    });

    it('should answer UNKNOWN with a generic message and log the error', async () => {
      const error = new Error('connect ECONNREFUSED 10.0.0.7:5432');

      await expect(
        lastValueFrom(filter.catch(new RpcException(error), null!)),
      ).rejects.toEqual({
        code: GrpcStatus.UNKNOWN,
        message: 'Internal server error',
      });
      expect(loggerErrorSpy).toHaveBeenCalledWith(error);
    });

    it('should still use its numeric code, but not its message, details and metadata', async () => {
      const error = Object.assign(new Error('14 UNAVAILABLE: stock'), {
        code: GrpcStatus.UNAVAILABLE,
        details: 'upstream stock.internal:5000',
        metadata: { 'x-upstream': 'stock' },
      });

      await expect(
        lastValueFrom(filter.catch(new RpcException(error), null!)),
      ).rejects.toEqual({
        code: GrpcStatus.UNAVAILABLE,
        message: 'Internal server error',
      });
      expect(loggerErrorSpy).toHaveBeenCalledWith(error);
    });

    it('should still use its numeric status as the code', async () => {
      const error = Object.assign(new Error('not found'), {
        status: GrpcStatus.NOT_FOUND,
      });

      await expect(
        lastValueFrom(filter.catch(new RpcException(error), null!)),
      ).rejects.toEqual({
        code: GrpcStatus.NOT_FOUND,
        message: 'Internal server error',
      });
    });

    it('should not log an intrinsic exception', async () => {
      await expect(
        lastValueFrom(
          filter.catch(
            new RpcException(new HttpException('Not Found', 404)),
            null!,
          ),
        ),
      ).rejects.toEqual({ code: 404, message: 'Internal server error' });
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it('should serialize an exception that returns itself from "getError" as before', async () => {
      await expect(
        lastValueFrom(
          filter.catch(new KafkaRetriableException('try again'), null!),
        ),
      ).rejects.toEqual({ code: GrpcStatus.UNKNOWN, message: 'try again' });
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });
  });

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
