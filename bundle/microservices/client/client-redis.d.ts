import { ClientProxy } from './client-proxy';
import { ClientOptions } from '../interfaces/client-metadata.interface';
import { WritePacket, ReadPacket } from './../interfaces';
import { RedisClient, ClientOpts, RetryStrategyOptions } from '../external/redis.interface';
import { Subject } from 'rxjs';
export declare class ClientRedis extends ClientProxy {
    private readonly options;
    private readonly logger;
    private readonly url;
    private pubClient;
    private subClient;
    private isExplicitlyTerminated;
    constructor(options: ClientOptions);
    getAckPatternName(pattern: string): string;
    getResPatternName(pattern: string): string;
    close(): void;
    connect(): Promise<any>;
    createClient(error$: Subject<Error>): RedisClient;
    handleError(client: RedisClient): void;
    getClientOptions(error$: Subject<Error>): Partial<ClientOpts>;
    createRetryStrategy(options: RetryStrategyOptions, error$: Subject<Error>): undefined | number | Error;
    protected publish(partialPacket: ReadPacket, callback: (packet: WritePacket) => any): Promise<(channel: string, buffer: string) => any>;
}
