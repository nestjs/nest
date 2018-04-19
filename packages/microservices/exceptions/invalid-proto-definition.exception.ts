import { RuntimeException } from '@nestjs/core/errors/exceptions/runtime.exception';

export class InvalidProtoDefinitionException extends RuntimeException {
  constructor() {
    super('Invalid .proto definition (file not found?)');
  }
}
