import { RuntimeException } from '@nestjs/core/errors/exceptions/runtime.exception';

/**
 * @publicApi
 */
export class InvalidGrpcPackageException extends RuntimeException {
  constructor(name: string) {
    super(`The invalid gRPC package (package "${name}" not found)`);
  }
}
