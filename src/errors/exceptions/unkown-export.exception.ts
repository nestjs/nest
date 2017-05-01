import { RuntimeException } from './runtime.exception';
import { UnkownExportMessage } from '../messages';

export class UnkownExportException extends RuntimeException {
    constructor(name: string) {
        super(UnkownExportMessage(name));
    }
}