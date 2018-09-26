import { UNKNOWN_EXPORT_MESSAGE } from '../messages';
import { RuntimeException } from './runtime.exception';

export class UnknownExportException extends RuntimeException {
  constructor(name: string) {
    super(UNKNOWN_EXPORT_MESSAGE`${name}`);
  }
}
