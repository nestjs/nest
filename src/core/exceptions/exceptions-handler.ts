import { Exception } from "./exception";

export class ExceptionsHandler {
    private UNKOWN_EXCEPTION_MSG = "Unkown exception";

    next(exception: Error | Exception, response) {
        if (!(exception instanceof Exception)) {
            response.status(500).json({ message: this.UNKOWN_EXCEPTION_MSG });
            return;
        }

        response.status(exception.getStatus()).json({
            message: exception.getMessage()
        });
    }

}
