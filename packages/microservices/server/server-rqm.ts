import { Server } from './server';
import { Options } from 'amqplib';
import { DISCONNECTED_RMQ_MESSAGE, DISCONNECT_EVENT, RQM_DEFAULT_URL, RQM_DEFAULT_QUEUE, RQM_DEFAULT_PREFETCH_COUNT, RQM_DEFAULT_IS_GLOBAL_PREFETCH_COUNT, RQM_DEFAULT_QUEUE_OPTIONS, CONNECT_EVENT } from './../constants';
import { CustomTransportStrategy, RmqOptions } from './../interfaces';
import { MicroserviceOptions } from '../interfaces/microservice-configuration.interface';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { Observable } from 'rxjs';
import * as amqp from 'amqp-connection-manager';

let rqmPackage: any = {};

export class ServerRMQ extends Server implements CustomTransportStrategy {
    private server: any = null;
    private channel: any = null;
    private urls: string[];
    private queue: string;
    private prefetchCount: number;
    private queueOptions: Options.AssertQueue;
    private isGlobalPrefetchCount: boolean;

    constructor(private readonly options: MicroserviceOptions) {
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
        rqmPackage = loadPackage('amqplib', ServerRMQ.name);
    }

    public async listen(callback: () => void): Promise<void> {
        await this.start(callback);
    }

    public close(): void {
        this.channel && this.channel.close();
        this.server && this.server.close();
    }

    private async start(callback?: () => void) {
        this.server = amqp.connect(this.urls);
        this.server.on(CONNECT_EVENT, x => {
            this.channel = this.server.createChannel({
                json: false,
                setup: async (channel) => {
                    await channel.assertQueue(this.queue, this.queueOptions);
                    await channel.prefetch(this.prefetchCount, this.isGlobalPrefetchCount);
                    channel.consume(this.queue, (msg) => this.handleMessage(msg), { noAck: true });
                    callback();
                },
            });
        });

        this.server.on(DISCONNECT_EVENT, err => {
            this.logger.error(DISCONNECTED_RMQ_MESSAGE);
        });
    }

    private async handleMessage(message): Promise<void> {
        const { content, properties } = message;
        const messageObj = JSON.parse(content.toString());
        const handlers = this.getHandlers();
        const pattern = JSON.stringify(messageObj.pattern);
        if (!this.messageHandlers[pattern]) {
            return;
        }
        const handler = this.messageHandlers[pattern];
        const response$ = this.transformToObservable(await handler(messageObj.data)) as Observable<any>;
        response$ && this.send(response$, (data) => this.sendMessage(data, properties.replyTo, properties.correlationId));
    }

    private sendMessage(message, replyTo, correlationId): void {
        const buffer = Buffer.from(JSON.stringify(message));
        this.channel.sendToQueue(replyTo, buffer, { correlationId });
    }
}
