import { Consumer, KafkaMessage, Producer } from '../external/kafka.interface';
import { BaseRpcContext } from './base-rpc.context';

type KafkaContextArgs = [
  message: KafkaMessage,
  partition: number,
  topic: string,
  consumer: Consumer,
  heartbeat: () => Promise<void>,
  producer: Producer,
];

export class KafkaContext extends BaseRpcContext<KafkaContextArgs> {
  constructor(args: KafkaContextArgs) {
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
}
