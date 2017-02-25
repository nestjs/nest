import { RuntimeException } from "./runtime.exception";
import { getUnkownExportMessage } from '../messages';

export class UnkownExportException extends RuntimeException {
    constructor(name: string) {
        super(getUnkownExportMessage(name));
    }
}