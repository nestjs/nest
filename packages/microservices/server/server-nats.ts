import { Observable } from 'rxjs';
import {
  CONNECT_EVENT,
  ERROR_EVENT,
  NATS_DEFAULT_URL,
  NO_PATTERN_MESSAGE,
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
    const subscribe = (channel: string) => {
      if (queue) {
        return client.subscribe(
          channel,
          { queue },
          this.getMessageHandler(channel, client).bind(this),
        );
      }
      client.subscribe(
        channel,
        this.getMessageHandler(channel, client).bind(this),
      );
    };
    const registeredPatterns = Object.keys(this.messageHandlers);
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

  public getMessageHandler(channel: string, client: Client) {
    return async (buffer, replyTo: string) =>
      this.handleMessage(channel, buffer, client, replyTo);
  }

  public async handleMessage(
    channel: string,
    message: ReadPacket & PacketId,
    client: Client,
    replyTo: string,
  ) {
    const publish = this.getPublisher(client, replyTo, message.id);
    const status = 'error';

    if (!this.messageHandlers[channel]) {
      return publish({ id: message.id, status, err: NO_PATTERN_MESSAGE });
    }
    const handler = this.messageHandlers[channel];
    const response$ = this.transformToObservable(
      await handler(message.data),
    ) as Observable<any>;
    response$ && this.send(response$, publish);
  }

  public getPublisher(publisher: Client, replyTo: string, id: string) {
    return response =>
      publisher.publish(
        replyTo,
        Object.assign(response, {
          id,
        }),
      );
  }

  public handleError(stream) {
    stream.on(ERROR_EVENT, err => this.logger.error(err));
  }
}
