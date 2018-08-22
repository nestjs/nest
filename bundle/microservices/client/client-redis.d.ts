import { Subject } from 'rxjs';
import { ClientOpts, RedisClient, RetryStrategyOptions } from '../external/redis.interface';
import { PacketId, ReadPacket, WritePacket } from '../interfaces';
import { ClientOptions } from '../interfaces/client-metadata.interface';
import { ClientProxy } from './client-proxy';
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
    createResponseCallback(packet: ReadPacket & PacketId, callback: (packet: WritePacket) => any): Function;
    protected publish(partialPacket: ReadPacket, callback: (packet: WritePacket) => any): Function;
}
