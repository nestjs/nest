import { Logger } from '@nestjs/common/services/logger.service';
import { Subject } from 'rxjs';
import { ClientOpts, RedisClient, RetryStrategyOptions } from '../external/redis.interface';
import { ReadPacket, WritePacket } from '../interfaces';
import { ClientOptions } from '../interfaces/client-metadata.interface';
import { ClientProxy } from './client-proxy';
export declare class ClientRedis extends ClientProxy {
    protected readonly options: ClientOptions['options'];
    protected readonly logger: Logger;
    protected readonly url: string;
    protected pubClient: RedisClient;
    protected subClient: RedisClient;
    protected connection: Promise<any>;
    private isExplicitlyTerminated;
    constructor(options: ClientOptions['options']);
    getAckPatternName(pattern: string): string;
    getResPatternName(pattern: string): string;
    close(): void;
    connect(): Promise<any>;
    createClient(error$: Subject<Error>): RedisClient;
    handleError(client: RedisClient): void;
    getClientOptions(error$: Subject<Error>): Partial<ClientOpts>;
    createRetryStrategy(options: RetryStrategyOptions, error$: Subject<Error>): undefined | number | Error;
    createResponseCallback(): Function;
    protected publish(partialPacket: ReadPacket, callback: (packet: WritePacket) => any): Function;
}
