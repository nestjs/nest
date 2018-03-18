import { RuntimeException } from '@nestjs/core/errors/exceptions/runtime.exception';

export class InvalidGrpcServiceException extends RuntimeException {
  constructor() {
    super(`Invalid gRPC service (not found)`);
  }
}
