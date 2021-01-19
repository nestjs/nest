import { BaseRpcContext } from './base-rpc.context';
import { Message } from '../external/gc-pubsub.interface';

type GCPubSubContextArgs = [Message, string];

export class GCPubSubContext extends BaseRpcContext<GCPubSubContextArgs> {
  constructor(args: GCPubSubContextArgs) {
    super(args);
  }

  /**
   * Returns the original message (with properties, fields, and content).
   */
  getMessage() {
    return this.args[0];
  }

  /**
   * Returns the name of the pattern.
   */
  getPattern() {
    return this.args[1];
  }
}
