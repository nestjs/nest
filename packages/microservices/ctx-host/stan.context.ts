import { BaseRpcContext } from './base-rpc.context';

type StanContextArgs = [string, Record<string, any>];

export class StanContext extends BaseRpcContext<StanContextArgs> {
  constructor(args: StanContextArgs) {
    super(args);
  }

  /**
   * Returns the name of the subject.
   */
  getSubject() {
    return this.args[0];
  }

  /**
   * Returns the original message.
   */
  getMessage() {
    return this.args[1];
  }
}
