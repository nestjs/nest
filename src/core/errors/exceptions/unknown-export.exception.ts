import {UnknownExportMessage} from '../messages';

import {RuntimeException} from './runtime.exception';

export class UnknownExportException extends RuntimeException {
  constructor(name: string) { super(UnknownExportMessage(name)); }
}