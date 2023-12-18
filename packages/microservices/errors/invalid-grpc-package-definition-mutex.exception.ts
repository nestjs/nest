import { RuntimeException } from '@nestjs/core/errors/exceptions/runtime.exception';

export class InvalidGrpcPackageDefinitionMutexException extends RuntimeException {
  constructor() {
    super(
      `Invalid gRPC configuration. Both protoPath and packageDefinition cannot be defined at the same time.`,
    );
  }
}
