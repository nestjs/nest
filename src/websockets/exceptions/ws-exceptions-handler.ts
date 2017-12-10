import { isEmpty, isObject } from '@nestjs/common/utils/shared.utils';

import { ExceptionFilterMetadata } from '@nestjs/common/interfaces/exceptions/exception-filter-metadata.interface';
import { InvalidExceptionFilterException } from '@nestjs/core/errors/exceptions/invalid-exception-filter.exception';
import { Logger } from '@nestjs/common';
import { WsException } from '../exceptions/ws-exception';
import { messages } from '@nestjs/core/constants';

export class WsExceptionsHandler {
    private filters: ExceptionFilterMetadata[] = [];

    public handle(exception: Error | WsException | any, client: any) {
        if (this.invokeCustomFilters(exception, client) || !client.emit) return;

        const status = 'error';
        if (!(exception instanceof WsException)) {
            const msg = messages.UNKNOWN_EXCEPTION_MESSAGE;
            return client.emit('exception', { status, message: msg });
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

    public invokeCustomFilters(exception: any, client: any): boolean {
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
