import { HttpException } from './http-exception';
import { messages } from '../constants';
import { Logger } from '../../common/services/logger.service';
import { ExceptionFilterMetadata } from '../../common/interfaces/exception-filter-metadata.interface';
import { isEmpty, isObject } from '../../common/utils/shared.utils';
import { InvalidExceptionFilterException } from '../../errors/exceptions/invalid-exception-filter.exception';

export class ExceptionsHandler {
    private readonly logger = new Logger(ExceptionsHandler.name);
    private filters: ExceptionFilterMetadata[] = [];

    public next(exception: Error | HttpException | any, response) {
        if (this.invokeCustomFilters(exception, response)) return;

        if (!(exception instanceof HttpException)) {
            response.status(500).json({ message: messages.UNKOWN_EXCEPTION_MESSAGE });

            this.logger.error(exception.message, exception.stack);
            return;
        }

        const res = exception.getResponse();
        const message = isObject(res) ? res : ({ message: res });
        response.status(exception.getStatus()).json(message);
    }

    public setCustomFilters(filters: ExceptionFilterMetadata[]) {
        if (!Array.isArray(filters)) {
            throw new InvalidExceptionFilterException();
        }
        this.filters = filters;
    }

    public invokeCustomFilters(exception, response): boolean {
        if (isEmpty(this.filters)) return false;

        const filter = this.filters.find(({ exceptionMetatypes, func }) => {
            const hasMetatype = !!exceptionMetatypes.find(
                ExceptionMetatype => exception instanceof ExceptionMetatype,
            );
            return hasMetatype;
        });
        filter && filter.func(exception, response);
        return !!filter;
    }
}
