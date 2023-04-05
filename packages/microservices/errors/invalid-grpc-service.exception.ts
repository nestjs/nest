import { RuntimeException } from '@nestjs/core/errors/exceptions/runtime.exception';

/**
 * @publicApi
 */
export class InvalidGrpcServiceException extends RuntimeException {
  constructor(name: string) {
    super(`The invalid gRPC service (service "${name}" not found)`);
  }
}
