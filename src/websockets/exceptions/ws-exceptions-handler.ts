import { messages } from '@nestjs/core/constants';
import { InvalidExceptionFilterException } from '@nestjs/core/errors/exceptions/invalid-exception-filter.exception';
import { ExceptionFilterMetadata } from '@nestjs/core/interfaces/exceptions/exception-filter-metadata.interface';
import { isEmpty, isObject } from '@nestjs/core/utils/shared.utils';
import { WsException } from '../exceptions/ws-exception';
import { Logger } from '';

export class WsExceptionsHandler {
    private filters: ExceptionFilterMetadata[] = [];

    public handle(exception: Error | WsException | any, client) {
        if (this.invokeCustomFilters(exception, client) || !client.emit) return;

        const status = 'error';
        if (!(exception instanceof WsException)) {
            const message = messages.UNKNOWN_EXCEPTION_MESSAGE;
            return client.emit('exception', { status, message });
        }
        const result = exception.getError();
        const message = isObject(result) ? result : ({
            status,
            message: result,
        });
        client.emit('exception', message);
    }

    public setCustomFilters(filters: ExceptionFilterMetadata[]) {
        if (!Array.isArray(filters)) {
            throw new InvalidExceptionFilterException();
        }
        this.filters = filters;
    }

    public invokeCustomFilters(exception, client): boolean {
        if (isEmpty(this.filters)) return false;

        const filter = this.filters.find(({ exceptionMetatypes, func }) => {
            const hasMetatype = !!exceptionMetatypes.find(
                ExceptionMetatype => exception instanceof ExceptionMetatype,
            );
            return hasMetatype;
        });
        filter && filter.func(exception, client);
        return !!filter;
    }
}
