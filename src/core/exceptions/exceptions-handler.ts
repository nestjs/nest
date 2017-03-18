import { HttpException } from './http-exception';
import { messages } from '../constants';
import { Logger } from '../../common/services/logger.service';

export class ExceptionsHandler {
    private readonly logger = new Logger(ExceptionsHandler.name);

    next(exception: Error | HttpException, response) {
        if (!(exception instanceof HttpException)) {
            response.status(500).json({ message: messages.UNKOWN_EXCEPTION_MESSAGE });

            this.logger.error(exception.message, exception.stack);
            return;
        }

        response.status(exception.getStatus()).json({
            message: exception.getMessage()
        });
    }

}
