import * as nats from 'nats';
import { ClientProxy } from './client-proxy';
import { Logger } from '@nestjs/common/services/logger.service';
import { ClientOptions } from '../interfaces/client-metadata.interface';
import { NATS_DEFAULT_URL, ERROR_EVENT, CONNECT_EVENT } from './../constants';
import { WritePacket } from './../interfaces';
import { ReadPacket, PacketId } from 'src/microservices';

export class ClientNats extends ClientProxy {
  private readonly logger = new Logger(ClientProxy.name);
  private readonly url: string;
  private pubClient: nats.Client;
  private subClient: nats.Client;

  constructor(private readonly options: ClientOptions) {
    super();
    this.url = options.url || NATS_DEFAULT_URL;
  }

  protected async sendMessage(
    partialPacket: ReadPacket,
    callback: (packet: WritePacket) => any,
  ) {
    if (!this.pubClient || !this.subClient) {
      await this.init(callback);
    }
    const packet = this.assignPacketId(partialPacket);
    const pattern = JSON.stringify(partialPacket.pattern);
    const responseChannel = this.getResPatternName(pattern, packet.id);

    const subscriptionId = this.subClient.subscribe(
      responseChannel,
      (message: WritePacket & PacketId) => {
        const { err, response, isDisposed } = message;
        if (isDisposed || err) {
          callback({
            err,
            response: null,
            isDisposed: true,
          });
          return this.subClient.unsubscribe(subscriptionId);
        }
        callback({
          err,
          response,
        });
      },
    );
    this.pubClient.publish(this.getAckPatternName(pattern), packet as any);
  }

  public getAckPatternName(pattern: string): string {
    return `${pattern}_ack`;
  }

  public getResPatternName(pattern: string, id: string): string {
    return `${pattern}_${id}_res`;
  }

  public close() {
    this.pubClient && this.pubClient.close();
    this.subClient && this.subClient.close();
    this.pubClient = this.subClient = null;
  }

  public async init(callback: (...args) => any) {
    this.pubClient = await this.createClient();
    this.subClient = await this.createClient();

    this.handleError(this.pubClient, callback);
    this.handleError(this.subClient, callback);
  }

  public createClient(): Promise<nats.Client> {
    const client = nats.connect({
      url: this.url,
      json: true,
      maxReconnectAttempts: this.options.retryAttempts,
      reconnectTimeWait: this.options.retryDelay,
    });
    return new Promise(resolve => client.on(CONNECT_EVENT, resolve));
  }

  public handleError(client: nats.Client, callback: (...args) => any) {
    const errorCallback = err => {
      if (err.code === 'ECONNREFUSED') {
        callback(err, null);
        this.pubClient = this.subClient = null;
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
