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
  private publisher: nats.Client;
  private consumer: nats.Client;

  constructor(private readonly options: ClientOptions) {
    super();
    this.url = options.url || NATS_DEFAULT_URL;
  }

  protected async publish(
    partialPacket: ReadPacket,
    callback: (packet: WritePacket) => any,
  ) {
    if (!this.publisher || !this.consumer) {
      await this.init(callback);
    }
    const packet = this.assignPacketId(partialPacket);
    const pattern = JSON.stringify(partialPacket.pattern);
    const responseChannel = this.getResPatternName(pattern, packet.id);

    const subscriptionId = this.consumer.subscribe(
      responseChannel,
      (message: WritePacket & PacketId) => {
        const { err, response, isDisposed } = message;
        if (isDisposed || err) {
          callback({
            err,
            response: null,
            isDisposed: true,
          });
          return this.consumer.unsubscribe(subscriptionId);
        }
        callback({
          err,
          response,
        });
      },
    );
    this.publisher.publish(this.getAckPatternName(pattern), packet as any);
  }

  public getAckPatternName(pattern: string): string {
    return `${pattern}_ack`;
  }

  public getResPatternName(pattern: string, id: string): string {
    return `${pattern}_${id}_res`;
  }

  public close() {
    this.publisher && this.publisher.close();
    this.consumer && this.consumer.close();
    this.publisher = this.consumer = null;
  }

  public async init(callback: (...args) => any) {
    this.publisher = await this.createClient();
    this.consumer = await this.createClient();

    this.handleError(this.publisher, callback);
    this.handleError(this.consumer, callback);
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
        this.publisher = this.consumer = null;
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
