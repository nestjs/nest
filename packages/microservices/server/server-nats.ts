import { isUndefined } from '@nestjs/common/utils/shared.utils';
import { Observable } from 'rxjs';
import {
  CONNECT_EVENT,
  ERROR_EVENT,
  NATS_DEFAULT_URL,
  NO_MESSAGE_HANDLER,
} from '../constants';
import { NatsContext } from '../ctx-host/nats.context';
import { Client } from '../external/nats-client.interface';
import { CustomTransportStrategy, PacketId } from '../interfaces';
import { NatsOptions } from '../interfaces/microservice-configuration.interface';
import { IncomingRequest, ReadPacket } from '../interfaces/packet.interface';
import { Server } from './server';
import { Transport } from '../enums';

let natsPackage: any = {};

export class ServerNats extends Server implements CustomTransportStrategy {
  private readonly url: string;
  private natsClient: Client;
  public readonly transportId: Transport = Transport.NATS;

  constructor(private readonly options: NatsOptions['options']) {
    super();
    this.url = this.getOptionsProp(this.options, 'url') || NATS_DEFAULT_URL;

    natsPackage = this.loadPackage('nats', ServerNats.name, () =>
      require('nats'),
    );

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
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
    const queue = this.getOptionsProp(this.options, 'queue');
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
    return async (
      buffer: ReadPacket & PacketId,
      replyTo: string,
      callerSubject: string,
    ) => this.handleMessage(channel, buffer, client, replyTo, callerSubject);
  }

  public async handleMessage(
    channel: string,
    rawMessage: any,
    client: Client,
    replyTo: string,
    callerSubject: string,
  ) {
    const natsCtx = new NatsContext([callerSubject]);
    const message = this.deserializer.deserialize(rawMessage, {
      channel,
      replyTo,
    });
    if (isUndefined((message as IncomingRequest).id)) {
      return this.handleEvent(channel, message, natsCtx);
    }
    const publish = this.getPublisher(
      client,
      replyTo,
      (message as IncomingRequest).id,
    );
    const handler = this.getHandlerByPattern(channel);
    if (!handler) {
      const status = 'error';
      const noHandlerPacket = {
        id: (message as IncomingRequest).id,
        status,
        err: NO_MESSAGE_HANDLER,
      };
      return publish(noHandlerPacket);
    }
    const response$ = this.transformToObservable(
      await handler(message.data, natsCtx),
    ) as Observable<any>;
    response$ && this.send(response$, publish);
  }

  public getPublisher(publisher: Client, replyTo: string, id: string) {
    return (response: any) => {
      Object.assign(response, { id });
      const outgoingResponse = this.serializer.serialize(response);
      return publisher.publish(replyTo, outgoingResponse);
    };
  }

  public handleError(stream: any) {
    stream.on(ERROR_EVENT, (err: any) => this.logger.error(err));
  }
}
