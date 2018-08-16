import { Logger } from '@nestjs/common/services/logger.service';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { ERROR_EVENT, MESSAGE_EVENT, MQTT_DEFAULT_URL } from '../constants';
import { MqttClient } from '../external/mqtt-client.interface';
import { MqttOptions, PacketId, ReadPacket, WritePacket } from '../interfaces';
import { ClientOptions } from '../interfaces/client-metadata.interface';
import { ClientProxy } from './client-proxy';
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
    if (this.mqttClient) {
      return Promise.resolve();
    }
    this.mqttClient = this.createClient();
    this.handleError(this.mqttClient);
    return this.connect$(this.mqttClient).toPromise();
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

  public createResponseCallback(
    packet: ReadPacket & PacketId,
    callback: (packet: WritePacket) => any,
  ): (channel: string, buffer) => any {
    return (channel: string, buffer: Buffer) => {
      const { err, response, isDisposed, id } = JSON.parse(
        buffer.toString(),
      ) as WritePacket & PacketId;
      if (id !== packet.id) {
        return undefined;
      }
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
      const pattern = this.normalizePattern(partialPacket.pattern);
      const responseChannel = this.getResPatternName(pattern);
      const responseCallback = this.createResponseCallback(packet, callback);

      this.mqttClient.on(MESSAGE_EVENT, responseCallback);
      this.mqttClient.subscribe(responseChannel);
      this.mqttClient.publish(
        this.getAckPatternName(pattern),
        JSON.stringify(packet),
      );
      return () => {
        this.mqttClient.unsubscribe(responseChannel);
        this.mqttClient.removeListener(MESSAGE_EVENT, responseCallback);
      };
    } catch (err) {
      callback({ err });
    }
  }
}
