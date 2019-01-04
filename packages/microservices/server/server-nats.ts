import { isUndefined } from '@nestjs/common/utils/shared.utils';
import { Observable } from 'rxjs';
import {
  CONNECT_EVENT,
  ERROR_EVENT,
  NATS_DEFAULT_URL,
  NO_EVENT_HANDLER,
  NO_MESSAGE_HANDLER,
} from '../constants';
import { Client } from '../external/nats-client.interface';
import { CustomTransportStrategy, PacketId } from '../interfaces';
import {
  MicroserviceOptions,
  NatsOptions,
} from '../interfaces/microservice-configuration.interface';
import { ReadPacket } from '../interfaces/packet.interface';
import { Server } from './server';

let natsPackage: any = {};

export class ServerNats extends Server implements CustomTransportStrategy {
  private readonly url: string;
  private natsClient: Client;

  constructor(private readonly options: MicroserviceOptions['options']) {
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
    const queue = this.getOptionsProp<NatsOptions>(this.options, 'queue');
    const subscribe = queue
      ? (channel: string) =>
          client.subscribe(
            channel,
            { queue },
            this.getMessageHandler(channel, client).bind(this),
          )
      : (channel: string) =>
          client.subscribe(
            channel,
            this.getMessageHandler(channel, client).bind(this),
          );

    const registeredPatterns = [...this.messageHandlers.keys()];
    registeredPatterns.forEach(channel => subscribe(channel));
  }

  public close() {
    this.natsClient && this.natsClient.close();
    this.natsClient = null;
  }

  public createNatsClient(): Client {
    const options = this.options || ({} as NatsOptions);
    return natsPackage.connect({
      ...options,
      url: this.url,
      json: true,
    });
  }

  public getMessageHandler(channel: string, client: Client): Function {
    return async (buffer: ReadPacket & PacketId, replyTo: string) =>
      this.handleMessage(channel, buffer, client, replyTo);
  }

  public async handleMessage(
    channel: string,
    message: ReadPacket & Partial<PacketId>,
    client: Client,
    replyTo: string,
  ) {
    if (isUndefined(message.id)) {
      return this.handleEvent(channel, message);
    }
    const publish = this.getPublisher(client, replyTo, message.id);
    const handler = this.getHandlerByPattern(channel);
    if (!handler) {
      const status = 'error';
      return publish({ id: message.id, status, err: NO_MESSAGE_HANDLER });
    }
    const response$ = this.transformToObservable(
      await handler(message.data),
    ) as Observable<any>;
    response$ && this.send(response$, publish);
  }

  public async handleEvent(pattern: string, packet: ReadPacket): Promise<any> {
    const handler = this.getHandlerByPattern(pattern);
    if (!handler) {
      return this.logger.error(NO_EVENT_HANDLER);
    }
    await handler(packet.data);
  }

  public getPublisher(publisher: Client, replyTo: string, id: string) {
    return (response: any) =>
      publisher.publish(
        replyTo,
        Object.assign(response, {
          id,
        }),
      );
  }

  public handleError(stream: any) {
    stream.on(ERROR_EVENT, (err: any) => this.logger.error(err));
  }
}
