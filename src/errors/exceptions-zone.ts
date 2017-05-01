import { ExceptionHandler } from './exception-handler';
import { UNHANDLED_RUNTIME_EXCEPTION } from './messages';

export class ExceptionsZone {
    private static readonly exceptionHandler = new ExceptionHandler();

    public static run(fn: () => void) {
        try {
            fn();
        }
        catch (e) {
            this.exceptionHandler.handle(e);
            throw UNHANDLED_RUNTIME_EXCEPTION;
        }
    }
}