import { isUndefined, isObject } from '@nestjs/common/utils/shared.utils';
import {
  NATS_DEFAULT_GRACE_PERIOD,
  NATS_DEFAULT_URL,
  NO_MESSAGE_HANDLER,
} from '../constants';
import { NatsContext } from '../ctx-host/nats.context';
import { NatsRequestJSONDeserializer } from '../deserializers/nats-request-json.deserializer';
import { Transport } from '../enums';
import {
  Client,
  NatsMsg,
  Subscription,
} from '../external/nats-client.interface';
import { CustomTransportStrategy } from '../interfaces';
import { NatsOptions } from '../interfaces/microservice-configuration.interface';
import { IncomingRequest } from '../interfaces/packet.interface';
import { NatsRecord } from '../record-builders';
import { NatsRecordSerializer } from '../serializers/nats-record.serializer';
import { Server } from './server';

let natsPackage = {} as any;

/**
 * @publicApi
 */
export class ServerNats extends Server implements CustomTransportStrategy {
  public readonly transportId = Transport.NATS;

  private natsClient: Client;

  private readonly subscriptions: Subscription[] = [];

  private readonly gracePeriod: number;

  constructor(private readonly options: NatsOptions['options']) {
    super();

    natsPackage = this.loadPackage('nats', ServerNats.name, () =>
      require('nats'),
    );

    this.gracePeriod =
      this.getOptionsProp(this.options, 'gracePeriod') ||
      NATS_DEFAULT_GRACE_PERIOD;

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
  }

  public async listen(
    callback: (err?: unknown, ...optionalParams: unknown[]) => void,
  ) {
    try {
      this.natsClient = await this.createNatsClient();
      this.handleStatusUpdates(this.natsClient);
      this.start(callback);
    } catch (err) {
      callback(err);
    }
  }

  public start(
    callback: (err?: unknown, ...optionalParams: unknown[]) => void,
  ) {
    this.bindEvents(this.natsClient);
    callback();
  }

  public bindEvents(client: Client) {
    const queue = this.getOptionsProp(this.options, 'queue');
    const subscribe = (channel: string) =>
      client.subscribe(channel, {
        queue,
        callback: this.getMessageHandler(channel).bind(this),
      });

    const registeredPatterns = [...this.messageHandlers.keys()];
    for (const channel of registeredPatterns) {
      const sub = subscribe(channel);
      this.subscriptions.push(sub);
    }
  }

  private async waitForGracePeriod() {
    await new Promise<void>(res => {
      setTimeout(() => {
        res();
      }, this.gracePeriod);
    });
  }

  public async close() {
    if (this.natsClient) {
      const graceful = this.getOptionsProp(this.options, 'gracefulShutdown');
      if (graceful) {
        this.subscriptions.forEach(sub => sub.unsubscribe());
        await this.waitForGracePeriod();
      }
      await this.natsClient?.close();
      this.natsClient = null;
    }
  }

  public createNatsClient(): Promise<Client> {
    const options = this.options || ({} as NatsOptions);
    return natsPackage.connect({
      servers: NATS_DEFAULT_URL,
      ...options,
    });
  }

  public getMessageHandler(channel: string): Function {
    return async (error: object | undefined, message: NatsMsg) => {
      if (error) {
        return this.logger.error(error);
      }
      return this.handleMessage(channel, message);
    };
  }

  public async handleMessage(channel: string, natsMsg: NatsMsg) {
    const callerSubject = natsMsg.subject;
    const rawMessage = natsMsg.data;
    const replyTo = natsMsg.reply;

    const natsCtx = new NatsContext([callerSubject, natsMsg.headers]);
    const message = await this.deserializer.deserialize(rawMessage, {
      channel,
      replyTo,
    });
    if (isUndefined((message as IncomingRequest).id)) {
      return this.handleEvent(channel, message, natsCtx);
    }
    const publish = this.getPublisher(natsMsg, (message as IncomingRequest).id);
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
    );
    response$ && this.send(response$, publish);
  }

  public getPublisher(natsMsg: NatsMsg, id: string) {
    if (natsMsg.reply) {
      return (response: any) => {
        Object.assign(response, { id });
        const outgoingResponse: NatsRecord =
          this.serializer.serialize(response);
        return natsMsg.respond(outgoingResponse.data, {
          headers: outgoingResponse.headers,
        });
      };
    }

    // In case the "reply" topic is not provided, there's no need for a reply.
    // Method returns a noop function instead
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return () => {};
  }

  public async handleStatusUpdates(client: Client) {
    for await (const status of client.status()) {
      const data =
        status.data && isObject(status.data)
          ? JSON.stringify(status.data)
          : status.data;

      switch (status.type) {
        case 'error':
        case 'disconnect':
          this.logger.error(
            `NatsError: type: "${status.type}", data: "${data}".`,
          );
          break;

        case 'pingTimer':
          if (this.options.debug) {
            this.logger.debug(
              `NatsStatus: type: "${status.type}", data: "${data}".`,
            );
          }
          break;

        default:
          this.logger.log(
            `NatsStatus: type: "${status.type}", data: "${data}".`,
          );
          break;
      }
    }
  }

  protected initializeSerializer(options: NatsOptions['options']) {
    this.serializer = options?.serializer ?? new NatsRecordSerializer();
  }

  protected initializeDeserializer(options: NatsOptions['options']) {
    this.deserializer =
      options?.deserializer ?? new NatsRequestJSONDeserializer();
  }
}
