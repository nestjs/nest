import { RuntimeException } from '../../errors/exceptions/runtime.exception';

export class InvalidSocketPortException extends RuntimeException {
    constructor(port, type) {
        super(`Invalid port (${port}) in Gateway ${type}!`);
    }
}