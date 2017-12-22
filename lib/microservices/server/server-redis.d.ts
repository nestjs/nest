import * as redis from 'redis';
import { Server } from './server';
import { MicroserviceConfiguration } from '../interfaces/microservice-configuration.interface';
import { CustomTransportStrategy } from './../interfaces';
import 'rxjs/add/operator/catch';
import 'rxjs/add/observable/empty';
import 'rxjs/add/operator/finally';
export declare class ServerRedis extends Server implements CustomTransportStrategy {
    private readonly url;
    private sub;
    private pub;
    constructor(config: MicroserviceConfiguration);
    listen(callback: () => void): void;
    start(callback?: () => void): void;
    close(): void;
    createRedisClient(): redis.RedisClient;
    handleConnection(callback: any, sub: any, pub: any): void;
    getMessageHandler(pub: any): (channel: any, buffer: any) => Promise<void>;
    handleMessage(channel: any, buffer: any, pub: any): Promise<void>;
    getPublisher(pub: any, pattern: any): (respond: any) => void;
    tryParse(content: any): any;
    getAckQueueName(pattern: any): string;
    getResQueueName(pattern: any): string;
    handleErrors(stream: any): void;
}
