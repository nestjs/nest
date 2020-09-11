import { BaseRpcContext } from './base-rpc.context';

type StanContextArgs = [string];

export class NatsContext extends BaseRpcContext<StanContextArgs> {
  constructor(args: StanContextArgs) {
    super(args);
  }

  /**
   * Returns the name of the subject.
   */
  getSubject() {
    return this.args[0];
  }
}
