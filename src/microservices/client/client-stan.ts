import * as stan from 'node-nats-streaming';
import { ClientProxy } from './client-proxy';
import { Logger } from '@nestjs/common/services/logger.service';
import { ClientOptions } from '../interfaces/client-metadata.interface';
import {
  STAN_DEFAULT_URL,
  ERROR_EVENT,
  CONNECT_EVENT,
  MESSAGE_EVENT,
} from './../constants';
import { WritePacket } from './../interfaces';
import { ReadPacket, PacketId } from 'src/microservices';

export class ClientStan extends ClientProxy {
  private readonly logger = new Logger(ClientProxy.name);
  private readonly url: string;
  private client: stan.Stan;

  constructor(private readonly options: ClientOptions) {
    super();
    this.url = options.url || STAN_DEFAULT_URL;
  }

  protected async publish(
    partialPacket: ReadPacket,
    callback: (packet: WritePacket) => any,
  ) {
    if (!this.client) {
      await this.init(callback);
    }
    const packet = this.assignPacketId(partialPacket);
    const pattern = JSON.stringify(partialPacket.pattern);
    const responseChannel = this.getResPatternName(pattern, packet.id);

    // TODO: Options
    const subscription = this.client.subscribe(responseChannel, 'default');
    subscription.on(MESSAGE_EVENT, (message: WritePacket & PacketId) => {
      const { err, response, isDisposed } = message;
      if (isDisposed || err) {
        callback({
          err,
          response: null,
          isDisposed: true,
        });
        return subscription.unsubscribe();
      }
      callback({
        err,
        response,
      });
    });
    this.client.publish(
      this.getAckPatternName(pattern),
      packet as any,
      err => err && callback({ err }),
    );
  }

  public getAckPatternName(pattern: string): string {
    return `${pattern}_ack`;
  }

  public getResPatternName(pattern: string, id: string): string {
    return `${pattern}_${id}_res`;
  }

  public close() {
    this.client && this.client.close();
    this.client = null;
  }

  public init(callback: (...args) => any) {
    this.client = this.createClient();
    this.handleError(this.client, callback);
  }

  public createClient(): stan.Stan {
    return stan.connect('clusterId', 'clientId2', {
      url: this.url,
    });
  }

  public handleError(client: stan.Stan, callback: (...args) => any) {
    const errorCallback = err => {
      if (err.code === 'ECONNREFUSED') {
        callback(err, null);
        this.client = null;
      }
      this.logger.error(err);
    };
    client.addListener(ERROR_EVENT, errorCallback);
    client.on(CONNECT_EVENT, () => {
      client.removeListener(ERROR_EVENT, errorCallback);
      client.addListener(ERROR_EVENT, err => this.logger.error(err));
    });
  }
}
