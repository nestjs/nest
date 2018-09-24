import { Logger } from '@nestjs/common/services/logger.service';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { fromEvent, merge, Observable } from 'rxjs';
import { first, map, share, tap } from 'rxjs/operators';
import {
  CLOSE_EVENT,
  ERROR_EVENT,
  MESSAGE_EVENT,
  MQTT_DEFAULT_URL,
} from '../constants';
import { MqttClient } from '../external/mqtt-client.interface';
import { MqttOptions, PacketId, ReadPacket, WritePacket } from '../interfaces';
import { ClientOptions } from '../interfaces/client-metadata.interface';
import { ClientProxy } from './client-proxy';
import { ECONNREFUSED } from './constants';

let mqttPackage: any = {};

export class ClientMqtt extends ClientProxy {
  protected readonly logger = new Logger(ClientProxy.name);
  protected readonly url: string;
  protected mqttClient: MqttClient;
  protected connection: Promise<any>;

  constructor(protected readonly options: ClientOptions['options']) {
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
    this.connection = null;
  }

  public connect(): Promise<any> {
    if (this.mqttClient) {
      return this.connection;
    }
    this.mqttClient = this.createClient();
    this.handleError(this.mqttClient);

    const connect$ = this.connect$(this.mqttClient);
    this.connection = this.mergeCloseEvent(this.mqttClient, connect$)
      .pipe(
        tap(() =>
          this.mqttClient.on(MESSAGE_EVENT, this.createResponseCallback()),
        ),
        share(),
      )
      .toPromise();
    return this.connection;
  }

  public mergeCloseEvent<T = any>(
    instance: MqttClient,
    source$: Observable<T>,
  ): Observable<T> {
    const close$ = fromEvent(instance, CLOSE_EVENT).pipe(
      map(err => {
        throw err;
      }),
    );
    return merge(source$, close$).pipe(first());
  }

  public createClient(): MqttClient {
    return mqttPackage.connect(this.url, this.options as MqttOptions);
  }

  public handleError(client: MqttClient) {
    client.addListener(
      ERROR_EVENT,
      err => err.code !== ECONNREFUSED && this.logger.error(err),
    );
  }

  public createResponseCallback(): (channel: string, buffer) => any {
    return (channel: string, buffer: Buffer) => {
      const { err, response, isDisposed, id } = JSON.parse(
        buffer.toString(),
      ) as WritePacket & PacketId;

      const callback = this.routingMap.get(id);
      if (!callback) {
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

      this.mqttClient.subscribe(responseChannel, err => {
        if (err) {
          return;
        }
        this.routingMap.set(packet.id, callback);
        this.mqttClient.publish(
          this.getAckPatternName(pattern),
          JSON.stringify(packet),
        );
      });
      return () => {
        this.mqttClient.unsubscribe(responseChannel);
        this.routingMap.delete(packet.id);
      };
    } catch (err) {
      callback({ err });
    }
  }
}
