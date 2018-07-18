import { Channel, Connection } from 'amqplib';
import { CONNECT_EVENT, ERROR_EVENT, MESSAGE_EVENT, RQM_DEFAULT_URL, SUBSCRIBE, RQM_DEFAULT_QUEUE } from './../constants';
import { Logger } from '@nestjs/common/services/logger.service';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { ClientProxy } from './client-proxy';
import { ClientOptions, RmqOptions } from '../interfaces';
import { EventEmitter } from 'events';

let rqmPackage: any = {};

export class ClientRMQ extends ClientProxy {
    private readonly logger = new Logger(ClientProxy.name);
    private client: Connection = null;
    private channel: Channel = null;
    private url: string;
    private queue: string;
    private replyQueue: string;
    private responseEmitter: EventEmitter;
    
    constructor(
        private readonly options: ClientOptions) {
        super();
        this.url =
            this.getOptionsProp<RmqOptions>(this.options, 'url') || RQM_DEFAULT_URL;
        this.queue =
            this.getOptionsProp<RmqOptions>(this.options, 'queue') || RQM_DEFAULT_QUEUE;
        rqmPackage = loadPackage('amqplib', ClientRMQ.name);
        this.connect();
    }

    protected async publish(messageObj, callback: (err, result, disposed?: boolean) => void) {
        try {
            if (!this.client) {
                await this.connect();
            }
            let correlationId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            this.responseEmitter.once(correlationId, msg => {
                this.handleMessage(msg, callback);
            });
            this.channel.sendToQueue(this.queue, Buffer.from(JSON.stringify(messageObj)), { 
                replyTo: this.replyQueue,
                correlationId: correlationId
            });
        } catch (err) {
            console.log(err);
            callback(err, null);
        }
    }

    private async handleMessage(message, callback): Promise<void> {
        if(message) {
            const { content } = message;
            const { err, response, isDisposed } = JSON.parse(content.toString());
            if (isDisposed || err) {
                callback({
                    err,
                    response: null,
                    isDisposed: true,
                });
            }
            callback({
                err,
                response,
            });         
        }
    }

    public close(): void {
        this.channel && this.channel.close();
        this.client && this.client.close();
    }

    public handleError(client: Connection): void {
        client.addListener(ERROR_EVENT, err => this.logger.error(err));
    }

    public listen() {
        this.channel.consume(this.replyQueue, (msg) => {
            this.responseEmitter.emit(msg.properties.correlationId, msg);
        }, { noAck: true });
    }

    public async connect():Promise<any> {
        return new Promise(async (resolve, reject) => {
            this.client = await rqmPackage.connect(this.url);
            this.channel = await this.client.createChannel();
            await this.channel.assertQueue(this.queue, { durable: false });
            this.replyQueue = (await this.channel.assertQueue('', { exclusive: true })).queue;
            this.responseEmitter = new EventEmitter();
            this.responseEmitter.setMaxListeners(0);
            this.listen();
            resolve();
        });
    }
}