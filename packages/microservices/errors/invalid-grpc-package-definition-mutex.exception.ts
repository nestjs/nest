import { RuntimeException } from '@nestjs/core/internal';

export class InvalidGrpcPackageDefinitionMutexException extends RuntimeException {
  constructor() {
    super(
      `Invalid gRPC configuration. Both protoPath and packageDefinition cannot be defined at the same time.`,
    );
  }
}
