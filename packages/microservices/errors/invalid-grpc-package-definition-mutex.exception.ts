import { RuntimeException } from '@nestjs/core/errors/exceptions/runtime.exception';

export class InvalidGrpcPackageDefinitionMutexException extends RuntimeException {
  constructor() {
    super(
      'Both protoPath and packageDefinition were provided, but only one can be defined',
    );
  }
}
