import { Connection, Options } from 'amqplib';
import { ERROR_EVENT, RQM_DEFAULT_URL, RQM_DEFAULT_QUEUE, RQM_DEFAULT_PREFETCH_COUNT, RQM_DEFAULT_IS_GLOBAL_PREFETCH_COUNT, RQM_DEFAULT_QUEUE_OPTIONS, CONNECT_EVENT, DISCONNECT_EVENT } from './../constants';
import { Logger } from '@nestjs/common/services/logger.service';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { ClientProxy } from './client-proxy';
import { ClientOptions, RmqOptions } from '../interfaces';
import { WritePacket } from './../interfaces';
import { EventEmitter } from 'events';
import * as amqp from 'amqp-connection-manager';

let rqmPackage: any = {};

export class ClientRMQ extends ClientProxy {
    private readonly logger = new Logger(ClientProxy.name);
    private client: any = null;
    private channel: any = null;
    private urls: string[];
    private queue: string;
    private prefetchCount: number;
    private isGlobalPrefetchCount: boolean;
    private queueOptions: Options.AssertQueue;
    private replyQueue: string;
    private responseEmitter: EventEmitter;

    constructor(
        private readonly options: ClientOptions['options']) {
        super();
        this.urls =
            this.getOptionsProp<RmqOptions>(this.options, 'urls') || [RQM_DEFAULT_URL];
        this.queue =
            this.getOptionsProp<RmqOptions>(this.options, 'queue') || RQM_DEFAULT_QUEUE;
        this.prefetchCount =
            this.getOptionsProp<RmqOptions>(this.options, 'prefetchCount') || RQM_DEFAULT_PREFETCH_COUNT;
        this.isGlobalPrefetchCount =
            this.getOptionsProp<RmqOptions>(this.options, 'isGlobalPrefetchCount') || RQM_DEFAULT_IS_GLOBAL_PREFETCH_COUNT;
        this.queueOptions =
            this.getOptionsProp<RmqOptions>(this.options, 'queueOptions') || RQM_DEFAULT_QUEUE_OPTIONS;
        rqmPackage = loadPackage('amqplib', ClientRMQ.name);
        this.connect();
    }

    public close(): void {
        this.channel && this.channel.close();
        this.client && this.client.close();
    }

    public listen() {
        this.channel.addSetup((channel) => {
            return Promise.all([
                channel.consume(this.replyQueue, (msg) => {
                    this.responseEmitter.emit(msg.properties.correlationId, msg);
                }, { noAck: true }),
            ]);
        });
    }

    public connect(): Promise<any> {
        if (this.client && this.channel) {
            return Promise.resolve();
        }
        return new Promise(async (resolve, reject) => {
            this.client = amqp.connect(this.urls);
            this.client.on(CONNECT_EVENT, x => {
                this.channel = this.client.createChannel({
                    json: false,
                    setup: async (channel) => {
                        await channel.assertQueue(this.queue, this.queueOptions);
                        await channel.prefetch(this.prefetchCount, this.isGlobalPrefetchCount);
                        this.replyQueue = (await channel.assertQueue('', { exclusive: true })).queue;
                        this.responseEmitter = new EventEmitter();
                        this.responseEmitter.setMaxListeners(0);
                        this.listen();
                        resolve();
                    },
                });
            });
            this.client.on(DISCONNECT_EVENT, err => {
                reject(err);
                this.client.close();
                this.client = null;
            });
        });
    }

    protected publish(messageObj, callback: (packet: WritePacket) => any) {
        if (!this.client) {
            this.connect().then(x => {
                this.sendMessage(messageObj, callback);
            });
        } else {
            this.sendMessage(messageObj, callback);
        }
    }

    private sendMessage(messageObj, callback: (packet: WritePacket) => any) {
        try {
            const correlationId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            this.responseEmitter.on(correlationId, msg => {
                const { content } = msg;
                this.handleMessage(content, callback);
            });
            this.channel.sendToQueue(this.queue, Buffer.from(JSON.stringify(messageObj)), {
                replyTo: this.replyQueue,
                correlationId,
            });
        } catch (err) {
            this.logger.error(err);
            callback({ err });
        }
    }

    public handleMessage(
        msg: WritePacket,
        callback: (packet: WritePacket) => any,
      ) {
        const { err, response, isDisposed } = JSON.parse(msg.toString());
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

    public handleError(client: Connection): void {
        client.addListener(ERROR_EVENT, err => this.logger.error(err));
    }
}