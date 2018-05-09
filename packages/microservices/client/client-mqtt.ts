import { ClientProxy } from './client-proxy';
import { Logger } from '@nestjs/common/services/logger.service';
import { ClientOptions } from '../interfaces/client-metadata.interface';
import {
  MQTT_DEFAULT_URL,
  MESSAGE_EVENT,
  ERROR_EVENT,
  CONNECT_EVENT,
  SUBSCRIBE,
} from './../constants';
import { WritePacket, MqttOptions } from './../interfaces';
import { ReadPacket, PacketId } from './../interfaces';
import { MqttClient } from '../external/mqtt-client.interface';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { ECONNREFUSED } from './constants';

let mqttPackage: any = {};

export class ClientMqtt extends ClientProxy {
  private readonly logger = new Logger(ClientProxy.name);
  private readonly url: string;
  private mqttClient: MqttClient;

  constructor(private readonly options: ClientOptions) {
    super();
    this.url =
      this.getOptionsProp<MqttOptions>(this.options, 'url') || MQTT_DEFAULT_URL;

    mqttPackage = loadPackage('mqtt', ClientMqtt.name);
  }
  public getAckPatternName(pattern: string): string {
    return `${pattern}_ack`;
  }

  public getResPatternName(pattern: string): string {
    return `${pattern}_res`;
  }

  public close() {
    this.mqttClient && this.mqttClient.end();
    this.mqttClient = null;
  }

  public connect(): Promise<any> {
    this.mqttClient = this.createClient();
    return new Promise((resolve, reject) => {
      this.handleError(this.mqttClient);
      this.connect$(this.mqttClient)
        .subscribe(resolve, reject);
    });
  }

  public createClient(): MqttClient {
    return mqttPackage.connect(this.url, this.options.options as MqttOptions);
  }

  public handleError(client: MqttClient) {
    client.addListener(
      ERROR_EVENT,
      err => err.code !== ECONNREFUSED && this.logger.error(err),
    );
  }

  protected async publish(
    partialPacket: ReadPacket,
    callback: (packet: WritePacket) => any,
  ): Promise<any> {
    try {
      if (!this.mqttClient) {
        await this.connect();
      }
      const packet = this.assignPacketId(partialPacket);
      const pattern = JSON.stringify(partialPacket.pattern);
      const responseChannel = this.getResPatternName(pattern);
      const responseCallback = (channel: string, buffer: Buffer) => {
        const { err, response, isDisposed, id } = JSON.parse(
          buffer.toString(),
        ) as WritePacket & PacketId;
        if (id !== packet.id) {
          return undefined;
        }
        if (isDisposed || err) {
          callback({
            err,
            response: null,
            isDisposed: true,
          });
          this.mqttClient.unsubscribe(channel);
          this.mqttClient.removeListener(MESSAGE_EVENT, responseCallback);
          return;
        }
        callback({
          err,
          response,
        });
      };
      this.mqttClient.on(MESSAGE_EVENT, responseCallback);
      this.mqttClient.subscribe(responseChannel);
      this.mqttClient.publish(
        this.getAckPatternName(pattern),
        JSON.stringify(packet),
      );
      return responseCallback;
    }
    catch (err) {
      callback({ err });
    }
  }
}
