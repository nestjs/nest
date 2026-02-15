import { RuntimeException } from '@nestjs/core/internal';

export class InvalidGrpcPackageDefinitionMissingPackageDefinitionException extends RuntimeException {
  constructor() {
    super(
      `Invalid gRPC configuration. protoPath or packageDefinition must be defined.`,
    );
  }
}
