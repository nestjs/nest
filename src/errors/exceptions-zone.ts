import { ExceptionHandler } from "./exception-handler";

export class ExceptionsZone {
    private static readonly exceptionHandler = new ExceptionHandler();

    static run(fn: () => void) {
        try {
            fn();
        }
        catch(e) {
            this.exceptionHandler.handle(e);
            throw 'Unhandled Nest application Runtime Exception';
        }
    }
}