import * as redis from 'redis';
import { ClientProxy } from './client-proxy';
import { ClientOptions } from '../interfaces/client-metadata.interface';
import { WritePacket } from './../interfaces';
import { ReadPacket } from './../interfaces';
export declare class ClientRedis extends ClientProxy {
    private readonly options;
    private readonly logger;
    private readonly url;
    private pubClient;
    private subClient;
    private isExplicitlyTerminated;
    constructor(options: ClientOptions);
    protected publish(partialPacket: ReadPacket, callback: (packet: WritePacket) => any): Promise<(channel: string, buffer: string) => any>;
    getAckPatternName(pattern: string): string;
    getResPatternName(pattern: string, id: string): string;
    close(): void;
    init(callback: (...args) => any): void;
    createClient(): redis.RedisClient;
    handleError(client: redis.RedisClient, callback: (...args) => any): void;
    getClientOptions(): Partial<redis.ClientOpts>;
    createRetryStrategy(options: redis.RetryStrategyOptions): undefined | number;
}
