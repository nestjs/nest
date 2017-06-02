import { Logger } from '@nestjs/common/services/logger.service';
import { MessageHandlers } from '../interfaces/message-handlers.interface';
import { Observable } from 'rxjs/Observable';
import { MicroserviceResponse } from '../index';

export abstract class Server {
    protected readonly messageHandlers: MessageHandlers = {};
    protected readonly logger = new Logger(Server.name);

    public getHandlers(): MessageHandlers {
        return this.messageHandlers;
    }

    public add(pattern, callback: (data) => Observable<any>) {
        this.messageHandlers[JSON.stringify(pattern)] = callback;
    }

    public send(stream$: Observable<any>, respond: (data: MicroserviceResponse) => void) {
        stream$.catch((err) => {
            respond({ err, response: null });
            return Observable.empty();
        })
        .finally(() => respond({ disposed: true }))
        .subscribe((response) => respond({ err: null, response }));
    }

    protected handleError(error: string) {
        this.logger.error(error);
    }
}