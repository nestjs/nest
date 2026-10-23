import { RuntimeException } from './runtime.exception.js';
import { UNDEFINED_MODULE_ENTRY_MESSAGE } from '../messages.js';

export class UndefinedModuleEntryException extends RuntimeException {
  constructor(
    parentModule: any,
    metadataKey: 'providers' | 'controllers' | 'exports',
    index: number,
  ) {
    super(UNDEFINED_MODULE_ENTRY_MESSAGE(parentModule, metadataKey, index));
  }
}
