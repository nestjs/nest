import { MqttClient } from 'mqtt';
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

let mqttPackage: any = {};

export class ClientMqtt extends ClientProxy {
  private readonly logger = new Logger(ClientProxy.name);
  private readonly url: string;
  private mqttClient: MqttClient;

  constructor(private readonly options: ClientOptions) {
    super();
    this.url =
      this.getOptionsProp<MqttOptions>(this.options, 'url') || MQTT_DEFAULT_URL;

    mqttPackage = this.loadPackage('mqtt', ClientMqtt.name);
  }

  protected publish(
    partialPacket: ReadPacket,
    callback: (packet: WritePacket) => any,
  ) {
    if (!this.mqttClient) {
      this.init(callback);
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

  public init(callback: (...args) => any) {
    this.mqttClient = this.createClient();
    this.handleError(this.mqttClient, callback);
  }

  public createClient(): MqttClient {
    return mqttPackage.connect(this.url, this.options.options as MqttOptions);
  }

  public handleError(client: MqttClient, callback: (...args) => any) {
    const errorCallback = err => {
      if (err.code === 'ECONNREFUSED') {
        callback(err, null);
        this.mqttClient = null;
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
