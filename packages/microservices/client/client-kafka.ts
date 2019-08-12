import * as util from 'util';
import { Logger } from '@nestjs/common/services/logger.service';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { EventEmitter } from 'events';
import { fromEvent, merge, Observable } from 'rxjs';
import { first, map, share, switchMap } from 'rxjs/operators';

import {
  KAFKA_DEFAULT_BROKER,
  KAFKA_DEFAULT_CLIENT,
  KAFKA_DEFAULT_GROUP,
  NO_MESSAGE_HANDLER
} from '../constants';
import { WritePacket, ReadPacket, KafkaOptions } from '../interfaces';
import { ClientProxy } from './client-proxy';

import {
  KafkaConfig,
  Kafka,
  Consumer,
  ConsumerConfig,
  EachBatchPayload,
  EachMessagePayload,
  Batch,
  Producer,
  ProducerRecord
} from '../external/kafka.interface';

let kafkaPackage: any = {};

export class ClientKafka extends ClientProxy {
  protected readonly logger = new Logger(ClientKafka.name);
  private client: Kafka = null;
  private producer: Producer = null;
  protected channel: any = null;
  protected urls: string[];
  protected queue: string;
  protected queueOptions: any;
  protected responseEmitter: EventEmitter;

  private readonly brokers: string[];
  private readonly clientId: string;

  constructor(protected readonly options: KafkaOptions['options']) {
    super();
    this.brokers = this.getOptionsProp(this.options.client, 'brokers') || [KAFKA_DEFAULT_BROKER];
    this.clientId = this.getOptionsProp(this.options.client, 'clientId') || KAFKA_DEFAULT_CLIENT;

    kafkaPackage = loadPackage('kafkajs', ClientKafka.name, () => require('kafkajs'));
  }

  public close(): void {
    this.producer && this.producer.disconnect();
    this.producer = null;
    this.client = null;
  }

  public async connect(): Promise<Producer> {
    if (this.client) {
      return this.producer;
    }
    this.client = this.createClient();
    this.producer = this.client.producer(this.options.producer);

    await this.producer.connect();
    return this.producer;
  }

  public createClient<T = any>(): T {
    return new kafkaPackage.Kafka(Object.assign(this.options.client || {}, {
      clientId: this.clientId,
      brokers: this.brokers,
      // logLevel: 5 // debug
    }) as KafkaConfig);
  }

  // protected abstract publish(
  //   packet: ReadPacket,
  //   callback: (packet: WritePacket) => void,
  // ): Function;
  
  // protected publish(
  //   partialPacket: ReadPacket,
  //   callback: (packet: WritePacket) => any,
  // ): Function {
  //   try {
  //     const packet = this.assignPacketId(partialPacket);

  //     const pattern = this.normalizePattern(partialPacket.pattern);
  //     const responseChannel = this.getResPatternName(pattern);

  //     this.routingMap.set(packet.id, callback);

  //     this.subClient.subscribe(responseChannel, (err: any) => {
  //       if (err) {
  //         return;
  //       }
  //       this.pubClient.publish(
  //         this.getAckPatternName(pattern),
  //         JSON.stringify(packet),
  //       );
  //     });

  //     return () => {
  //       this.subClient.unsubscribe(responseChannel);
  //       this.routingMap.delete(packet.id);
  //     };
  //   } catch (err) {
  //     callback({ err });
  //   }
  // }

  // protected abstract dispatchEvent<T = any>(packet: ReadPacket): Promise<T>;

  protected dispatchEvent(packet: ReadPacket): Promise<any> {
    const pattern = this.normalizePattern(packet.pattern);

    this.logger.error(util.format('dispatch event packet: %o', packet));

    return this.producer.send({
      topic: pattern,
      messages: packet.data
    });
  }

  public send<TResult = any, TInput = any>(
    pattern: any,
    data: TInput,
  ): Observable<TResult> {
    throw new Error(
      'Method is not supported in Kafka mode (learn more in the documentation).',
    );
  }

  protected publish(packet: any, callback: (packet: any) => any): any {
    throw new Error(
      'Method is not supported in Kafka mode (learn more in the documentation).',
    );
  }
}
