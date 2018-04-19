import { RuntimeException } from './runtime.exception';
import { UnknownExportMessage } from '../messages';

export class UnknownExportException extends RuntimeException {
  constructor(name: string) {
    super(UnknownExportMessage(name));
  }
}
