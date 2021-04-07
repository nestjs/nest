import { KafkaMessage } from '../external/kafka.interface';

import { BaseRpcContext } from './base-rpc.context';

type KafkaContextArgs = [KafkaMessage, number, string];

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
}
