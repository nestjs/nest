import { Logger } from '@nestjs/common/services/logger.service';
import { isUndefined } from '@nestjs/common/utils/shared.utils';
import { Observable } from 'rxjs';
import {
  CONNECT_EVENT,
  ERROR_EVENT,
  MESSAGE_EVENT,
  NO_MESSAGE_HANDLER,
  STAN_DEFAULT_URL,
} from '../constants';
import { StanContext } from '../ctx-host/stan.context';
import { Transport } from '../enums';
import {
  Client,
  Message,
  SubscriptionOptions,
} from '../external/stan-client.interface';
import { CustomTransportStrategy, PacketId } from '../interfaces';
import { StanOptions } from '../interfaces/microservice-configuration.interface';
import { IncomingRequest, ReadPacket } from '../interfaces/packet.interface';
import { Server } from './server';

let stanPackage: any = {};

export class ServerStan extends Server implements CustomTransportStrategy {
  public readonly transportId = Transport.STAN;

  protected logger = new Logger(ServerStan.name);

  private readonly url: string;
  private stanClient: Client;

  constructor(private readonly options: StanOptions['options']) {
    super();
    this.url = this.getOptionsProp(this.options, 'url') || STAN_DEFAULT_URL;

    stanPackage = this.loadPackage('node-nats-streaming', ServerStan.name, () =>
      require('node-nats-streaming'),
    );

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
  }

  public listen(callback: () => void) {
    this.stanClient = this.createStanClient();
    this.handleError(this.stanClient);
    this.start(callback);
  }

  public start(callback?: () => void) {
    this.stanClient.on(CONNECT_EVENT, () => {
      this.bindEvents(this.stanClient);
      this.stanClient.on(CONNECT_EVENT, callback);
    });
  }

  public bindEvents(client: Client) {
    const queue = this.getOptionsProp(this.options, 'queue');
    const subscribe = queue
      ? (channel: string, opts: SubscriptionOptions) =>
          client.subscribe(channel, queue, opts)
      : (channel: string, opts: SubscriptionOptions) =>
          client.subscribe(channel, opts);

    const registeredPatterns = [...this.messageHandlers.keys()];

    registeredPatterns.forEach(channel => {
      const handler = this.getMessageHandler(channel, client).bind(this);
      const subOpts = this.buildSubscriptionOptions(client);

      const sub = subscribe(this.getRequestPattern(channel), subOpts);
      sub.on('ready', () => {
        this.logger.debug(`subscription ${channel} is ready`);
        sub.on(MESSAGE_EVENT, handler);
      });
      sub.on('error', err => this.logger.error('subscription error: ', err));
      sub.on('timeout', err =>
        this.logger.error('subscription timeout: ', err),
      );
      sub.on('unsubscribed', () =>
        this.logger.debug(`subscription ${channel} unsubscribed`),
      );
      sub.on('closed', () =>
        this.logger.debug(`subscription ${channel} closed`),
      );
    });
  }

  public close() {
    this.stanClient && this.stanClient.close();
    this.stanClient = null;
  }

  public createStanClient(): Client {
    const options = this.options || ({} as StanOptions['options']);
    const { clusterId, clientId, ...rest } = options;
    return stanPackage.connect(clusterId, clientId, {
      ...rest,
      url: this.url,
      // json: true,
    });
  }

  public getMessageHandler(channel: string, client: Client): Function {
    return async (buffer: Message) =>
      this.handleMessage(channel, buffer, client);
  }

  public async handleMessage(
    channel: string,
    rawMessage: Message,
    client: Client,
  ) {
    const dataStr = rawMessage.getRawData().toString();
    const message = this.deserializer.deserialize(this.parseMessage(dataStr), {
      channel,
    });

    const stanCtx = new StanContext([channel, rawMessage]);

    if (isUndefined((message as IncomingRequest).id)) {
      return this.handleEvent(channel, message, stanCtx);
    }

    const publish = this.getPublisher(
      client,
      channel,
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
      await handler(message.data, stanCtx),
    ) as Observable<any>;
    response$ && this.send(response$, publish);
  }

  public getPublisher(publisher: Client, channel: string, id: string) {
    return (response: any) => {
      Object.assign(response, { id });
      const outgoingResponse = this.serializer.serialize(response);
      return publisher.publish(
        this.getReplyPattern(channel),
        JSON.stringify(outgoingResponse),
      );
    };
  }

  public handleError(stream: any) {
    stream.on(ERROR_EVENT, (err: any) => this.logger.error(err));
  }

  public parseMessage(content: string): ReadPacket & PacketId {
    try {
      return JSON.parse(content);
    } catch (e) {
      return content as any;
    }
  }

  public getRequestPattern(pattern: string): string {
    return pattern;
  }

  public getReplyPattern(pattern: string): string {
    return `${pattern}.reply`;
  }

  public buildSubscriptionOptions(
    channel: string,
    client: Client,
    options: StanOptions['options'],
  ): SubscriptionOptions {
    const subOpts = client.subscriptionOptions();
    const { subscriptionOptions } = options;

    if (!isUndefined(subscriptionOptions)) {
      if (!isUndefined(subscriptionOptions.durableName)) {
        subOpts.setDurableName(subscriptionOptions.durableName + '-' + channel); // 'durable-' + channel
      }

      if (!isUndefined(subscriptionOptions.maxInFlight)) {
        subOpts.setMaxInFlight(subscriptionOptions.maxInFlight);
      }

      if (!isUndefined(subscriptionOptions.ackWait)) {
        subOpts.setAckWait(subscriptionOptions.ackWait);
      }

      if (!isUndefined(subscriptionOptions.startAtPosition)) {
        subOpts.setStartAt(subscriptionOptions.startAtPosition);
      }

      if (!isUndefined(subscriptionOptions.startAtSequence)) {
        subOpts.setStartAtSequence(subscriptionOptions.startAtSequence);
      }

      if (!isUndefined(subscriptionOptions.startAtTime)) {
        subOpts.setStartTime(subscriptionOptions.startAtTime);
      }

      if (!isUndefined(subscriptionOptions.noAck)) {
        subOpts.setManualAckMode(subscriptionOptions.noAck);
      }
    }

    return subOpts;
  }
}
