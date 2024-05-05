import { KafkaConsumer as Consumer, HighLevelProducer, Message } from '../external/rd-kafka.interface';
import { BaseRpcContext } from './base-rpc.context';

type RdKafkaContextArgs = [
  message: Message,
  partition: number,
  topic: string,
  consumer: Consumer,
  producer: HighLevelProducer,
];

export class RdKafkaContext extends BaseRpcContext<RdKafkaContextArgs> {
  constructor(args: RdKafkaContextArgs) {
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
   * Returns the Kafka producer reference,
   */
  getProducer() {
    return this.args[4];
  }
}
