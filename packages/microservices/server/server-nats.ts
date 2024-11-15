import { isObject, isUndefined } from '@nestjs/common/utils/shared.utils';
import { EventEmitter } from 'events';
import { NATS_DEFAULT_URL, NO_MESSAGE_HANDLER } from '../constants';
import { NatsContext } from '../ctx-host/nats.context';
import { NatsRequestJSONDeserializer } from '../deserializers/nats-request-json.deserializer';
import { Transport } from '../enums';
import { NatsEvents, NatsEventsMap, NatsStatus } from '../events/nats.events';
import { NatsOptions } from '../interfaces/microservice-configuration.interface';
import { IncomingRequest } from '../interfaces/packet.interface';
import { NatsRecord } from '../record-builders';
import { NatsRecordSerializer } from '../serializers/nats-record.serializer';
import { Server } from './server';

let natsPackage = {} as any;

// To enable type safety for Nats. This cant be uncommented by default
// because it would require the user to install the nats package even if they dont use Nats
// Otherwise, TypeScript would fail to compile the code.
//
// type Client = import('nats').NatsConnection;
// type NatsMsg = import('nats').Msg;

type Client = any;
type NatsMsg = any;

/**
 * @publicApi
 */
export class ServerNats extends Server<NatsEvents, NatsStatus> {
  public readonly transportId = Transport.NATS;

  private natsClient: Client;
  protected statusEventEmitter = new EventEmitter<{
    [key in keyof NatsEvents]: Parameters<NatsEvents[key]>;
  }>();

  constructor(private readonly options: NatsOptions['options']) {
    super();

    natsPackage = this.loadPackage('nats', ServerNats.name, () =>
      require('nats'),
    );

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
  }

  public async listen(
    callback: (err?: unknown, ...optionalParams: unknown[]) => void,
  ) {
    try {
      this.natsClient = await this.createNatsClient();

      this._status$.next(NatsStatus.CONNECTED);
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
    registeredPatterns.forEach(channel => subscribe(channel));
  }

  public async close() {
    await this.natsClient?.close();
    this.statusEventEmitter.removeAllListeners();

    this.natsClient = null;
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
          this.logger.error(
            `NatsError: type: "${status.type}", data: "${data}".`,
          );
          break;

        case 'disconnect':
          this.logger.error(
            `NatsError: type: "${status.type}", data: "${data}".`,
          );

          this._status$.next(NatsStatus.DISCONNECTED);
          this.statusEventEmitter.emit(
            NatsEventsMap.DISCONNECT,
            status.data as string,
          );
          break;

        case 'pingTimer':
          if (this.options.debug) {
            this.logger.debug(
              `NatsStatus: type: "${status.type}", data: "${data}".`,
            );
          }
          break;

        case 'reconnecting':
          this._status$.next(NatsStatus.RECONNECTING);
          break;

        case 'reconnect':
          this.logger.log(
            `NatsStatus: type: "${status.type}", data: "${data}".`,
          );

          this._status$.next(NatsStatus.CONNECTED);
          this.statusEventEmitter.emit(
            NatsEventsMap.RECONNECT,
            status.data as string,
          );
          break;

        case 'update':
          this.logger.log(
            `NatsStatus: type: "${status.type}", data: "${data}".`,
          );
          this.statusEventEmitter.emit(NatsEventsMap.UPDATE, status.data);
          break;

        default:
          this.logger.log(
            `NatsStatus: type: "${status.type}", data: "${data}".`,
          );
          break;
      }
    }
  }

  public unwrap<T>(): T {
    if (!this.natsClient) {
      throw new Error(
        'Not initialized. Please call the "listen"/"startAllMicroservices" method before accessing the server.',
      );
    }
    return this.natsClient as T;
  }

  public on<
    EventKey extends keyof NatsEvents = keyof NatsEvents,
    EventCallback extends NatsEvents[EventKey] = NatsEvents[EventKey],
  >(event: EventKey, callback: EventCallback) {
    this.statusEventEmitter.on(event, callback as any);
  }

  protected initializeSerializer(options: NatsOptions['options']) {
    this.serializer = options?.serializer ?? new NatsRecordSerializer();
  }

  protected initializeDeserializer(options: NatsOptions['options']) {
    this.deserializer =
      options?.deserializer ?? new NatsRequestJSONDeserializer();
  }
}
