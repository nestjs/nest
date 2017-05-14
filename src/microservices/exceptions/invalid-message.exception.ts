import { RuntimeException } from '@nestjs/core/errors/exceptions/runtime.exception';

export class InvalidMessageException extends RuntimeException {
    constructor() {
        super(`Invalid message pattern or data!`);
    }
}