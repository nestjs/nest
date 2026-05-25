import { UNKNOWN_EXPORT_MESSAGE } from '../messages.js';
import { RuntimeException } from './runtime.exception.js';

export class UnknownExportException extends RuntimeException {
  constructor(token: string | symbol, moduleName: string) {
    super(UNKNOWN_EXPORT_MESSAGE(token, moduleName));
  }
}
