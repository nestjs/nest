import { Observable } from 'rxjs';
import { NO_PATTERN_MESSAGE } from '../constants';
import { Client } from '../external/nats-client.interface';
import { MicroserviceOptions, NatsOptions } from '../interfaces/microservice-configuration.interface';
import { CONNECT_EVENT, ERROR_EVENT, NATS_DEFAULT_URL } from './../constants';
import { CustomTransportStrategy, PacketId } from './../interfaces';
import { ReadPacket } from './../interfaces/packet.interface';
import { Server } from './server';

let natsPackage: any = {};

export class ServerNats extends Server implements CustomTransportStrategy {
  private readonly url: string;
  private natsClient: Client;

  constructor(private readonly options: MicroserviceOptions) {
    super();
    this.url =
      this.getOptionsProp<NatsOptions>(this.options, 'url') || NATS_DEFAULT_URL;

    natsPackage = this.loadPackage('nats', ServerNats.name);
  }

  public listen(callback: () => void) {
    this.natsClient = this.createNatsClient();
    this.handleError(this.natsClient);
    this.start(callback);
  }

  public start(callback?: () => void) {
    this.bindEvents(this.natsClient);
    this.natsClient.on(CONNECT_EVENT, callback);
  }

  public bindEvents(client: Client) {
    const registeredPatterns = Object.keys(this.messageHandlers);
    registeredPatterns.forEach(pattern => {
      const channel = this.getAckQueueName(pattern);
      client.subscribe(
        channel,
        this.getMessageHandler(channel, client).bind(this),
      );
    });
  }

  public close() {
    this.natsClient && this.natsClient.close();
    this.natsClient = null;
  }

  public createNatsClient(): Client {
    const options = this.options.options || ({} as NatsOptions);
    return natsPackage.connect({
      ...(options as any),
      url: this.url,
      json: true,
    });
  }

  public getMessageHandler(channel: string, client: Client) {
    return async buffer => await this.handleMessage(channel, buffer, client);
  }

  public async handleMessage(
    channel: string,
    message: ReadPacket & PacketId,
    client: Client,
  ) {
    const pattern = channel.replace(/_ack$/, '');
    const publish = this.getPublisher(client, pattern, message.id);
    const status = 'error';

    if (!this.messageHandlers[pattern]) {
      return publish({ id: message.id, status, err: NO_PATTERN_MESSAGE });
    }
    const handler = this.messageHandlers[pattern];
    const response$ = this.transformToObservable(
      await handler(message.data),
    ) as Observable<any>;
    response$ && this.send(response$, publish);
  }

  public getPublisher(publisher: Client, pattern: any, id: string) {
    return response =>
      publisher.publish(this.getResQueueName(pattern), Object.assign(response, {
        id,
      }) as any);
  }

  public getAckQueueName(pattern: string): string {
    return `${pattern}_ack`;
  }

  public getResQueueName(pattern: string): string {
    return `${pattern}_res`;
  }

  public handleError(stream) {
    stream.on(ERROR_EVENT, err => this.logger.error(err));
  }
}
