import { Logger } from '@nestjs/common/services/logger.service';
import { MessageHandlers } from '../interfaces/message-handlers.interface';
import { Observable, Subscription } from 'rxjs';
import { WritePacket, MicroserviceOptions } from './../interfaces';
export declare abstract class Server {
    protected readonly messageHandlers: MessageHandlers;
    protected readonly logger: Logger;
    getHandlers(): MessageHandlers;
    getHandlerByPattern(pattern: string): (data) => Promise<Observable<any>> | null;
    add(pattern: any, callback: (data) => Promise<Observable<any>>): void;
    send(stream$: Observable<any>, respond: (data: WritePacket) => void): Subscription;
    transformToObservable<T = any>(resultOrDeffered: any): Observable<T>;
    getOptionsProp<T extends {
        options?;
    }>(obj: MicroserviceOptions, prop: keyof T['options'], defaultValue?: any): any;
    protected handleError(error: string): void;
    protected loadPackage(name: string, ctx: string): any;
}
