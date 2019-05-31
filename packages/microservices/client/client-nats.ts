import { Logger } from '@nestjs/common/services/logger.service';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { share } from 'rxjs/operators';
import { ERROR_EVENT, NATS_DEFAULT_URL } from '../constants';
import { Client } from '../external/nats-client.interface';
import { NatsOptions, PacketId, ReadPacket, WritePacket } from '../interfaces';
import { ClientProxy } from './client-proxy';
import { CONN_ERR } from './constants';

let natsPackage: any = {};

export class ClientNats extends ClientProxy {
  protected readonly logger = new Logger(ClientProxy.name);
  protected readonly url: string;
  protected natsClient: Client;
  protected connection: Promise<any>;

  constructor(protected readonly options: NatsOptions['options']) {
    super();
    this.url = this.getOptionsProp(this.options, 'url') || NATS_DEFAULT_URL;
    natsPackage = loadPackage('nats', ClientNats.name, () => require('nats'));
  }

  public close() {
    this.natsClient && this.natsClient.close();
    this.natsClient = null;
    this.connection = null;
  }

  public async connect(): Promise<any> {
    if (this.natsClient) {
      return this.connection;
    }
    this.natsClient = this.createClient();
    this.handleError(this.natsClient);

    this.connection = await this.connect$(this.natsClient)
      .pipe(share())
      .toPromise();
    return this.connection;
  }

  public createClient(): Client {
    const options: any = this.options || ({} as NatsOptions);
    return natsPackage.connect({
      ...options,
      url: this.url,
      json: true,
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
    return (message: WritePacket & PacketId) => {
      if (message.id !== packet.id) {
        return undefined;
      }
      const { err, response, isDisposed } = message;
      if (isDisposed || err) {
        return callback({
          err,
          response: null,
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

      const subscriptionHandler = this.createSubscriptionHandler(
        packet,
        callback,
      );
      const subscriptionId = this.natsClient.request(
        channel,
        packet as any,
        subscriptionHandler,
      );
      return () => this.natsClient.unsubscribe(subscriptionId);
    } catch (err) {
      callback({ err });
    }
  }

  protected dispatchEvent(packet: ReadPacket): Promise<any> {
    const pattern = this.normalizePattern(packet.pattern);
    return new Promise((resolve, reject) =>
      this.natsClient.publish(pattern, packet as any, err =>
        err ? reject(err) : resolve(),
      ),
    );
  }
}
