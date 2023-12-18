import { RuntimeException } from '@nestjs/core/errors/exceptions/runtime.exception';

export class InvalidGrpcPackageDefinitionMissingPacakgeDefinitionException extends RuntimeException {
  constructor() {
    super('protoPath or packageDefinition must be defined');
  }
}
