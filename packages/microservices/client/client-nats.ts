import { Client } from 'nats';
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

let natsPackage: any = {};

export class ClientNats extends ClientProxy {
  private readonly logger = new Logger(ClientProxy.name);
  private readonly url: string;
  private natsClient: Client;

  constructor(private readonly options: ClientOptions) {
    super();
    this.url =
      this.getOptionsProp<NatsOptions>(this.options, 'url') || NATS_DEFAULT_URL;
    
    natsPackage = this.loadPackage('nats', ClientNats.name);
  }

  protected async publish(
    partialPacket: ReadPacket,
    callback: (packet: WritePacket) => any,
  ) {
    if (!this.natsClient) {
      await this.init(callback);
    }
    const packet = this.assignPacketId(partialPacket);
    const pattern = JSON.stringify(partialPacket.pattern);
    const responseChannel = this.getResPatternName(pattern);

    const subscriptionHandler = (message: WritePacket & PacketId) => {
      if (message.id !== packet.id) {
        return void 0;
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

  public async init(callback: (...args) => any) {
    this.natsClient = await this.createClient();
    this.handleError(this.natsClient, callback);
  }

  public createClient(): Promise<Client> {
    const options = this.options.options || ({} as NatsOptions);
    const client = natsPackage.connect({
      ...(options as any),
      url: this.url,
      json: true,
    });
    return new Promise(resolve => client.on(CONNECT_EVENT, resolve));
  }

  public handleError(client: Client, callback: (...args) => any) {
    const errorCallback = err => {
      if (err.code === 'ECONNREFUSED') {
        callback(err, null);
        this.natsClient = null;
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
