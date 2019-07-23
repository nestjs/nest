import { isString, isUndefined } from '@nestjs/common/utils/shared.utils';
import {
  ConnectableObservable,
  EMPTY,
  from,
  Observable,
  of,
  Subscription,
  forkJoin
} from 'rxjs';
import {
  map, finalize, flatMap, takeWhile, mergeMap, concatAll
} from 'rxjs/operators';
import {
  KAFKA_DEFAULT_BROKER,
  KAFKA_DEFAULT_CLIENT,
  KAFKA_DEFAULT_GROUP,
  NO_MESSAGE_HANDLER
} from '../constants';
import {
  KafkaConfig,
  Kafka,
  Consumer,
  ConsumerConfig,
  EachBatchPayload,
  EachMessagePayload,
  Batch
} from '../external/kafka.interface';
import { CustomTransportStrategy, KafkaOptions } from '../interfaces';
import { KafkaConsumerHandlerType, KafkaConsumerSubscriptionOptions, KafkaConsumerRunOptions } from '../decorators';
import { Server } from './server';
import * as util from 'util';

let kafkaPackage: any = {};

export class ServerKafka extends Server implements CustomTransportStrategy {
  private client: Kafka = null;
  private consumer: Consumer = null;
  private readonly brokers: string[];
  private readonly clientId: string;
  private readonly groupId: string;

  constructor(private readonly options: KafkaOptions['options']) {
    super();
    this.brokers = this.getOptionsProp(this.options.client, 'brokers') || [KAFKA_DEFAULT_BROKER];
    this.clientId = this.getOptionsProp(this.options.client, 'clientId') || KAFKA_DEFAULT_CLIENT;
    this.groupId = this.getOptionsProp(this.options.consumer, 'groupId') || KAFKA_DEFAULT_GROUP;

    kafkaPackage = this.loadPackage('kafkajs', ServerKafka.name, () => require('kafkajs'));
  }

  public async listen(callback: () => void): Promise<void> {
    this.client = this.createClient();
    await this.start(callback);
  }

  public close(): void {
    this.consumer && this.consumer.disconnect();
  }

  public async start(callback: () => void): Promise<void> {
    this.consumer = this.client.consumer(Object.assign(this.options.consumer || {}, {
      groupId: this.groupId
    }));

    await this.consumer.connect();
    await this.bindEvents(this.consumer);
    callback();
  }

  public createClient<T = any>(): T {
    return new kafkaPackage.Kafka(Object.assign(this.options.client || {}, {
      clientId: this.clientId,
      brokers: this.brokers,
      // logLevel: 5 // debug
    }) as KafkaConfig);
  }

  public async bindEvents(consumer: Consumer) {
    const registeredPatterns = [...this.messageHandlers.keys()];
    await Promise.all(registeredPatterns.map(async pattern => {
      // subscribe to the pattern of the topic
      await consumer.subscribe({
        topic: pattern
      });
    }));

    await consumer.run(Object.assign(this.options.run || {}, {
      // eachBatch: this.getMessageHandler(consumer).bind(this)
      eachMessage: this.getMessageHandler(consumer)
    }));
  }

  public getMessageHandler(consumer: Consumer): Function {
    return async (payload: EachMessagePayload) => {
      return this.handleMessage(consumer, payload);
    };
  }

  public async handleMessage(
    consumer: Consumer,
    payload: EachMessagePayload
  ) {
    // if (isUndefined(message.id)) {
    //   return this.handleEvent(, message);
    // }

    return this.handleEvent(payload.topic, {
      pattern: payload.topic,
      data: payload
    });

    // const handler = this.getHandlerByPattern(payload.topic);

    // if (!handler) {
    //   this.handleError(NO_MESSAGE_HANDLER);
    // }

    // const response$ = this.transformToObservable(
    //   await handler(payload),
    // ) as Observable<any>;

    // // const response$ = this.transformToObservable(
    // //   await handler(payload.message),
    // // ).pipe(map(() => {
    // //   return payload.message;
    // // }));
    // // // ) as Observable<any>;

    // response$ && this.send(response$, async (data) => {
    //   this.logger.error(util.format('this.send() data %o', data));

    //   if (data.isDisposed){
    //     return;
    //   }

    //   if (!data.err) {
    //     // await payload.resolveOffset(data.response.offset);
    //   }

    //   if (data.err) {
    //     throw data.err;
    //   }
    // });
  }

  // public async handleMessage(
  //   consumer: Consumer,
  //   payload: EachBatchPayload
  // ) {
  //   // if (isUndefined(message.id)) {
  //   //   return this.handleEvent(channel, message);
  //   // }

  //   const handler = this.getHandlerByPattern(payload.batch.topic);

  //   if (!handler) {
  //     this.handleError(NO_MESSAGE_HANDLER);
  //   }

  //   // const response$ = from(payload.batch.messages).pipe(map(async (message) => {
  //   //   await handler(message);
  //   // }), finalize(async () => {
  //   //     await payload.heartbeat();

  //   // }));

  //   const response$ = from(payload.batch.messages).pipe(
  //     takeWhile(() => {
  //       return (payload.isRunning() && !payload.isStale());
  //     }),
  //     mergeMap((message) => {
  //       return forkJoin(
  //         of(message),
  //         async () => {
  //           return this.transformToObservable(await handler(message)) as Observable<any>;
  //         }
  //       );

  //       // return this.transformToObservable(await handler(message)) as Observable<any>;
  //     }),
  //     concatAll()
  //     // mergeMap(async (message) => {
  //     //   return this.transformToObservable(await handler(message)) as Observable<any>;
  //     // })
  //   );

  //   // response$.pipe(takeWhile(() => {
  //   //   return (payload.isRunning() && !payload.isStale());
  //   // }), map(async (message) => {
  //   //   this.logger.error(util.format('response$.pipe() message %o', message));
  //   //   return this.transformToObservable(await handler(message)) as Observable<any>;
  //   // }));

  //   // response$.pipe(map((message) => {
  //   //   this.logger.error(util.format('response$.pipe() message %o', message));

  //   //   return message;
  //   //   // return this.transformToObservable(await handler(message)) as Observable<any>;
  //   // }));
    
  //   // this.transformToObservable(
  //   //   await handler(payload.batch.messages)
  //   // );
    
  //   // const response$ = this.transformToObservable(
  //   //   await handler(message.data),
  //   // ) as Observable<any>;

  //   response$ && this.send(response$, async (data) => {
  //     this.logger.error(util.format('this.send() data %o', data));

  //     if (data.isDisposed){
  //       return;
  //     }

  //     if (!data.err) {
  //       // await payload.resolveOffset(data.response.offset);
  //     }

  //     await payload.heartbeat();
  //   });
  // }
}
