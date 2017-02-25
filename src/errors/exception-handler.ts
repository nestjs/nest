import { RuntimeException } from "./exceptions/runtime.exception";
import { Logger } from '../common/services/logger.service';

export class ExceptionHandler {
    private readonly logger = new Logger(ExceptionHandler.name);

    handle(exception: RuntimeException | Error) {
        if (!(exception instanceof RuntimeException)) {
            this.logger.error(exception.message, exception.stack);
            return;
        }
        this.logger.error(exception.what(), exception.stack);
    }
}