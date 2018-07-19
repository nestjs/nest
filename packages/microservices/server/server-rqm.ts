import { Server } from './server';
import { Channel, Connection } from 'amqplib';
import { RQM_DEFAULT_URL , RQM_DEFAULT_QUEUE } from './../constants';
import { CustomTransportStrategy, RmqOptions } from './../interfaces';
import { MicroserviceOptions } from '../interfaces/microservice-configuration.interface';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { Observable } from 'rxjs';

let rqmPackage: any = {};

export class ServerRMQ extends Server implements CustomTransportStrategy {
    private server: Connection = null;
    private channel: Channel = null;
    private url: string;
    private queue: string;

    constructor(private readonly options: MicroserviceOptions) {
        super();
        this.url =
            this.getOptionsProp<RmqOptions>(this.options, 'url') || RQM_DEFAULT_URL;
        this.queue =
            this.getOptionsProp<RmqOptions>(this.options, 'queue') || RQM_DEFAULT_QUEUE;
        rqmPackage = loadPackage('amqplib', ServerRMQ.name);
      }

  public async listen(callback: () => void): Promise<void> {
    await this.start(callback);
    this.channel.consume(this.queue, (msg) => this.handleMessage(msg) , {
      noAck: true,
    });
  }

  private async start(callback?: () => void) {
      try {
        this.server = await rqmPackage.connect(this.url);
        this.channel = await this.server.createChannel();
        this.channel.assertQueue(this.queue, { durable: false });
      } catch (err) {
        this.logger.error(err);
      }
  }

  public close(): void {
    this.channel && this.channel.close();
    this.server && this.server.close();
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
    this.channel.sendToQueue(replyTo, buffer, {correlationId: correlationId});
  }
}
