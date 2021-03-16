import { BaseRpcContext } from './base-rpc.context';

type NatsContextArgs = [string, any];

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
   * Returns message headers (if exist).
   */
  getHeaders() {
    return this.args[1];
  }
}
