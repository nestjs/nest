import { Logger } from '@nestjs/common/services/logger.service';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { share } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { ERROR_EVENT, MESSAGE_EVENT, STAN_DEFAULT_URL } from '../constants';
import {
  Client,
  Message,
  Subscription,
} from '../external/stan-client.interface';
import { PacketId, ReadPacket, StanOptions, WritePacket } from '../interfaces';
import { ClientProxy } from './client-proxy';
import { CONN_ERR } from './constants';

let stanPackage: any = {};

export class ClientStan extends ClientProxy {
  protected readonly logger = new Logger(ClientProxy.name);
  protected readonly url: string;
  protected stanClient: Client;
  protected connection: Promise<any>;

  protected readonly subscriptionsCount = new Map<string, number>();
  protected readonly subscriptions = new Map<string, Subscription>();

  constructor(protected readonly options: StanOptions['options']) {
    super();
    this.url = this.getOptionsProp(this.options, 'url') || STAN_DEFAULT_URL;
    stanPackage = loadPackage('node-nats-streaming', ClientStan.name, () =>
      require('node-nats-streaming'),
    );

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
  }

  public close() {
    this.stanClient && this.stanClient.close();
    this.stanClient = null;
    this.connection = null;
  }

  public async connect(): Promise<any> {
    if (this.stanClient) {
      return this.connection;
    }
    this.stanClient = this.createClient();
    this.handleError(this.stanClient);

    this.connection = await this.connect$(this.stanClient)
      .pipe(share())
      .toPromise();
    return this.connection;
  }

  public createClient(): Client {
    const options: any = this.options || ({} as StanOptions);
    const { clusterId, clientId, ...rest } = options;

    return stanPackage.connect(clusterId, `${clientId}-client-${uuidv4()}`, {
      ...rest,
      url: this.url,
      // json: true,
    });
  }

  public handleError(client: Client) {
    client.addListener(
      ERROR_EVENT,
      (err: any) => err.code !== CONN_ERR && this.logger.error(err),
    );
  }

  public createSubscriptionHandler(
    packet: ReadPacket & PacketId,
    callback: (packet: WritePacket) => any,
  ): Function {
    return (rawPacket: unknown) => {
      const message = this.deserializer.deserialize(rawPacket);
      if (message.id && message.id !== packet.id) {
        return undefined;
      }
      const { err, response, isDisposed } = message;
      if (isDisposed || err) {
        return callback({
          err,
          response,
          isDisposed: true,
        });
      }
      callback({
        err,
        response,
      });
    };
  }

  protected publish(
    partialPacket: ReadPacket,
    callback: (packet: WritePacket) => any,
  ): Function {
    try {
      const packet = this.assignPacketId(partialPacket);
      const channel = this.normalizePattern(partialPacket.pattern);
      const serializedPacket = this.serializer.serialize(packet);

      const responseChannel = this.getReplyPattern(channel);
      const subscription = this.subscriptions.get(responseChannel);

      const publishPacket = () => {
        const subscriptionsCount =
          this.subscriptionsCount.get(responseChannel) || 0;
        this.subscriptionsCount.set(responseChannel, subscriptionsCount + 1);
        this.routingMap.set(packet.id, callback);
        this.stanClient.publish(
          this.getRequestPattern(channel),
          JSON.stringify(serializedPacket),
        );
      };

      if (!subscription) {
        const subOpts = this.stanClient.subscriptionOptions();
        subOpts.setDurableName('durable-' + channel);

        const sub = this.options.queue
          ? this.stanClient.subscribe(
              responseChannel,
              this.options.queue,
              subOpts,
            )
          : this.stanClient.subscribe(responseChannel, subOpts);

        sub.on('ready', () => {
          sub.on(MESSAGE_EVENT, this.createResponseCallback());

          this.subscriptions.set(responseChannel, sub);
          publishPacket();
        });
      } else {
        publishPacket();
      }

      return () => {
        this.unsubscribeFromChannel(responseChannel);
        this.routingMap.delete(packet.id);
      };
    } catch (err) {
      callback({ err });
    }
  }

  protected dispatchEvent(packet: ReadPacket): Promise<any> {
    const pattern = this.normalizePattern(packet.pattern);
    const serializedPacket = this.serializer.serialize(packet);

    return new Promise((resolve, reject) =>
      this.stanClient.publish(pattern, JSON.stringify(serializedPacket), err =>
        err ? reject(err) : resolve(),
      ),
    );
  }

  protected unsubscribeFromChannel(channel: string) {
    const subscriptionCount = this.subscriptionsCount.get(channel);
    this.subscriptionsCount.set(channel, subscriptionCount - 1);

    if (subscriptionCount - 1 <= 0) {
      this.subscriptions.get(channel).unsubscribe();
      this.subscriptions.delete(channel);
      this.subscriptionsCount.delete(channel);
    }
  }

  public getReplyPattern(pattern: string): string {
    return `${pattern}.reply`;
  }

  public getRequestPattern(pattern: string): string {
    return pattern;
  }

  public createResponseCallback(): (msg: Message) => any {
    return (msg: Message) => {
      const packet = JSON.parse(msg.getData() as string);
      const { err, response, isDisposed, id } = this.deserializer.deserialize(
        packet,
      );

      const callback = this.routingMap.get(id);
      if (!callback) {
        return undefined;
      }
      if (isDisposed || err) {
        return callback({
          err,
          response,
          isDisposed: true,
        });
      }
      callback({
        err,
        response,
      });
    };
  }
}
