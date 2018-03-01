import * as redis from 'redis';
import { ClientProxy } from './client-proxy';
import { ClientMetadata } from '../interfaces/client-metadata.interface';
export declare class ClientRedis extends ClientProxy {
    private readonly metadata;
    private readonly logger;
    private readonly url;
    private pubClient;
    private subClient;
    private isExplicitlyTerminated;
    constructor(metadata: ClientMetadata);
    protected sendMessage(msg: any, callback: (...args) => any): (channel: any, message: any) => void;
    getAckPatternName(pattern: string): string;
    getResPatternName(pattern: string): string;
    close(): void;
    init(callback: (...args) => any): void;
    createClient(): redis.RedisClient;
    handleError(stream: any, callback: (...args) => any): void;
    getClientOptions(): Partial<redis.ClientOpts>;
    createRetryStrategy(options: redis.RetryStrategyOptions): undefined | number;
}
