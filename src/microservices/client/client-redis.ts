import * as redis from 'redis';
import { ClientProxy } from './client-proxy';
import { Logger } from '@nestjs/common/services/logger.service';
import { ClientMetadata } from '../interfaces/client-metadata.interface';

const DEFAULT_URL = 'redis://localhost:6379';
const MESSAGE_EVENT = 'message';
const ERROR_EVENT = 'error';

export class ClientRedis extends ClientProxy {
    private readonly logger = new Logger(ClientProxy.name);
    private readonly url: string;

    private pub: redis.RedisClient;
    private sub: redis.RedisClient;

    constructor(metadata: ClientMetadata) {
        super();

        const { url } = metadata;
        this.url = url || DEFAULT_URL;
        this.init();
    }

    public sendSingleMessage(msg, callback: (...args) => any) {
        const pattern = JSON.stringify(msg.pattern);
        const responseCallback = (channel, message) => {
            const { err, response, disposed } = JSON.parse(message);
            if (disposed) {
                callback(null, null, true);
                this.sub.unsubscribe(this.getResPatternName(pattern));
                this.sub.removeListener(MESSAGE_EVENT, responseCallback);
                return;
            }
            callback(err, response);
        };

        this.sub.on(MESSAGE_EVENT, responseCallback);
        this.sub.subscribe(this.getResPatternName(pattern));
        this.pub.publish(this.getAckPatternName(pattern), JSON.stringify(msg));
        return responseCallback;
    }

    public getAckPatternName(pattern: string): string {
        return `${pattern}_ack`;
    }

    public getResPatternName(pattern: string): string {
        return `${pattern}_res`;
    }

    private init() {
        this.pub = this.createClient();
        this.sub = this.createClient();

        this.handleErrors(this.pub);
        this.handleErrors(this.sub);
    }

    private createClient(): redis.RedisClient {
        return redis.createClient({ url: this.url });
    }

    private handleErrors(stream) {
        stream.on(ERROR_EVENT, (err) => this.logger.error(err));
    }
}