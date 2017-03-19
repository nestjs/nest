import * as redis from 'redis';
import { ClientProxy } from './client-proxy';
import { Logger } from '../../common/services/logger.service';
import { ClientMetadata } from '../interfaces/client-metadata.interface';

export class ClientRedis extends ClientProxy {
    private readonly logger = new Logger(ClientProxy.name);
    private readonly DEFAULT_URL = 'redis://localhost:6379';
    private readonly url: string;

    private pub: redis.RedisClient;
    private sub: redis.RedisClient;

    constructor({ url }: ClientMetadata) {
        super();

        this.url = url || this.DEFAULT_URL;
        this.init();
    }

    sendSingleMessage(msg, callback: Function) {
        const pattern = JSON.stringify(msg.pattern);
        const subscription = (channel, msg) => {
            const { err, response } = JSON.parse(msg);
            callback(err, response);

            this.sub.unsubscribe(this.getResPatternName(pattern));
            this.sub.removeListener('message', subscription);
        };

        this.sub.on('message', subscription);
        this.sub.subscribe(this.getResPatternName(pattern));
        this.pub.publish(this.getAckPatternName(pattern), JSON.stringify(msg));

        return subscription;
    }

    getAckPatternName(pattern: string): string {
        return `${pattern}_ack`;
    }

    getResPatternName(pattern: string): string {
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
        stream.on('error', (err) => this.logger.error(err));
    }

}