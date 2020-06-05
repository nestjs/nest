import { BaseRpcContext } from './base-rpc.context';

type NatsContextArgs = [string, string];

export class NatsContext extends BaseRpcContext<NatsContextArgs> {
  constructor(args: NatsContextArgs) {
    super(args);
  }

  /**
   * Returns the name of the subject.
   */
  getSubject() {
    return this.args[0];
  }

  /**
   * Returns the replyTo.
   */
  getReplyTo() {
    return this.args[1];
  }
}
