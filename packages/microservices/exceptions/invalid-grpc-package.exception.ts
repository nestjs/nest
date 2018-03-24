import { RuntimeException } from '@nestjs/core/errors/exceptions/runtime.exception';

export class InvalidGrpcPackageException extends RuntimeException {
  constructor() {
    super('Invalid gRPC package (not found)');
  }
}
