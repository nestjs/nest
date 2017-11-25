import {
  RuntimeException
} from '@nestjs/core/errors/exceptions/runtime.exception';

export class UnknownModuleException extends RuntimeException {
  constructor() { super(); }
}