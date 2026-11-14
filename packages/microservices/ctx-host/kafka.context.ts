import { KafkaDriverTypes } from '../interfaces/kafka-driver-types.interface.js';
import { KafkaDriver } from '../interfaces/microservice-configuration.interface.js';
import { PacketMetadata } from '../interfaces/packet.interface.js';
import { BaseRpcContext } from './base-rpc.context.js';

type KafkaContextArgs<TDriver extends KafkaDriver> = [
  message: KafkaDriverTypes[TDriver]['message'],
  partition: number,
  topic: string,
  consumer: KafkaDriverTypes[TDriver]['consumer'],
  heartbeat: () => Promise<void>,
  producer: KafkaDriverTypes[TDriver]['producer'],
  metadata?: PacketMetadata,
];

/**
 * The context of a Kafka message. Its message, consumer and producer are those
 * of the client library the server runs on: use `KafkaContext<'kafka-core'>`
 * on kafka-core, whose offsets and timestamps are bigint values.
 *
 * @publicApi
 */
export class KafkaContext<
  TDriver extends KafkaDriver = 'kafkajs',
> extends BaseRpcContext<KafkaContextArgs<TDriver>> {
  constructor(args: KafkaContextArgs<TDriver>) {
    super(args);
  }

  /**
   * Returns the reference to the original message.
   */
  getMessage() {
    return this.args[0];
  }

  /**
   * Returns the partition.
   */
  getPartition() {
    return this.args[1];
  }

  /**
   * Returns the name of the topic.
   */
  getTopic() {
    return this.args[2];
  }

  /**
   * Returns the Kafka consumer reference.
   */
  getConsumer() {
    return this.args[3];
  }

  /**
   * Returns the Kafka heartbeat callback.
   */
  getHeartbeat() {
    return this.args[4];
  }

  /**
   * Returns the Kafka producer reference,
   */
  getProducer() {
    return this.args[5];
  }

  /**
   * Returns the message headers as packet metadata: what the client attached
   * to the packet, and every other header with a single, UTF-8 text value,
   * as it arrived (the headers of `getMessage()` are decoded, so a value that
   * reads as JSON is an object there). A header with several values or with
   * binary content is only available through `getMessage()`.
   */
  getMetadata(): PacketMetadata | undefined {
    return this.args[6];
  }
}
