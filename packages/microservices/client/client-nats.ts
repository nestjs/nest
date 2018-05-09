import { ClientProxy } from './client-proxy';
import { Logger } from '@nestjs/common/services/logger.service';
import { ClientOptions } from '../interfaces/client-metadata.interface';
import { NATS_DEFAULT_URL, ERROR_EVENT, CONNECT_EVENT } from './../constants';
import {
  WritePacket,
  NatsOptions,
  ReadPacket,
  PacketId,
} from './../interfaces';
import { Client } from '../external/nats-client.interface';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { CONN_ERR } from './constants';

let natsPackage: any = {};

export class ClientNats extends ClientProxy {
  private readonly logger = new Logger(ClientProxy.name);
  private readonly url: string;
  private natsClient: Client;

  constructor(private readonly options: ClientOptions) {
    super();
    this.url =
      this.getOptionsProp<NatsOptions>(this.options, 'url') || NATS_DEFAULT_URL;
    natsPackage = loadPackage('nats', ClientNats.name);
  }

  public getAckPatternName(pattern: string): string {
    return `${pattern}_ack`;
  }

  public getResPatternName(pattern: string): string {
    return `${pattern}_res`;
  }

  public close() {
    this.natsClient && this.natsClient.close();
    this.natsClient = null;
  }

  public async connect(): Promise<any> {
    this.natsClient = await this.createClient();
    return new Promise((resolve, reject) => {
      this.handleError(this.natsClient);
      this.connect$(this.natsClient)
        .subscribe(resolve, reject);
    });
  }

  public createClient(): Promise<Client> {
    const options: any = this.options.options || ({} as NatsOptions);
    return natsPackage.connect({
      ...options,
      url: this.url,
      json: true,
    });
  }

  public handleError(client: Client) {
    client.addListener(
      ERROR_EVENT,
      err => err.code !== CONN_ERR && this.logger.error(err),
    );
  }

  protected async publish(
    partialPacket: ReadPacket,
    callback: (packet: WritePacket) => any,
  ): Promise<any> {
    try {
      if (!this.natsClient) {
        await this.connect();
      }
      const packet = this.assignPacketId(partialPacket);
      const pattern = JSON.stringify(partialPacket.pattern);
      const responseChannel = this.getResPatternName(pattern);

      const subscriptionHandler = (message: WritePacket & PacketId) => {
        if (message.id !== packet.id) {
          return undefined;
        }
        const { err, response, isDisposed } = message;
        if (isDisposed || err) {
          callback({
            err,
            response: null,
            isDisposed: true,
          });
          return this.natsClient.unsubscribe(subscriptionId);
        }
        callback({
          err,
          response,
        });
      };
      const subscriptionId = this.natsClient.subscribe(
        responseChannel,
        subscriptionHandler,
      );
      this.natsClient.publish(this.getAckPatternName(pattern), packet as any);
      return subscriptionHandler;
    } catch (err) {
      callback({ err });
    }
  }
}
