import { MISSING_DECORATOR_METADATA_MESSAGE } from '../messages.js';
import { RuntimeException } from './runtime.exception.js';

export class MissingDecoratorMetadataException extends RuntimeException {
  constructor(type: string | symbol, index: number) {
    super(MISSING_DECORATOR_METADATA_MESSAGE(type, index));
  }
}
