import * as redis from 'redis';
import { Server } from './server';
import { MicroserviceConfiguration } from '../interfaces/microservice-configuration.interface';
import { CustomTransportStrategy } from './../interfaces';
export declare class ServerRedis extends Server implements CustomTransportStrategy {
    private readonly config;
    private readonly url;
    private subClient;
    private pubClient;
    private isExplicitlyTerminated;
    constructor(config: MicroserviceConfiguration);
    listen(callback: () => void): void;
    start(callback?: () => void): void;
    bindEvents(subClient: redis.RedisClient, pubClient: redis.RedisClient): void;
    close(): void;
    createRedisClient(): redis.RedisClient;
    getMessageHandler(pub: any): (channel: any, buffer: any) => Promise<any>;
    handleMessage(channel: any, buffer: any, pub: any): Promise<any>;
    getPublisher(pub: any, pattern: any): (respond: any) => any;
    tryParse(content: any): any;
    getAckQueueName(pattern: any): string;
    getResQueueName(pattern: any): string;
    handleError(stream: any): void;
    getClientOptions(): Partial<redis.ClientOpts>;
    createRetryStrategy(options: redis.RetryStrategyOptions): undefined | number;
}
