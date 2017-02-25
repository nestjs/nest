import { HttpException } from './http-exception';

export class ExceptionsHandler {
    private UNKOWN_EXCEPTION = 'Unkown exception';

    next(exception: Error | HttpException, response) {
        if (!(exception instanceof HttpException)) {
            response.status(500).json({ message: this.UNKOWN_EXCEPTION });
            return;
        }

        response.status(exception.getStatus()).json({
            message: exception.getMessage()
        });
    }

}
