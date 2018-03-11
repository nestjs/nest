import { Logger } from '@nestjs/common/services/logger.service';
import { MessageHandlers } from '../interfaces/message-handlers.interface';
import { Observable } from 'rxjs/Observable';
import { MicroserviceResponse } from '../index';
import { Subscription } from 'rxjs/Subscription';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/finally';
import 'rxjs/add/observable/empty';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/fromPromise';
export declare abstract class Server {
    protected readonly messageHandlers: MessageHandlers;
    protected readonly logger: Logger;
    getHandlers(): MessageHandlers;
    add(pattern: any, callback: (data) => Promise<Observable<any>>): void;
    send(stream$: Observable<any>, respond: (data: MicroserviceResponse) => void): Subscription;
    transformToObservable(resultOrDeffered: any): any;
    protected handleError(error: string): void;
}
