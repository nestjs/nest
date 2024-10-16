import { LocalDomainSocket } from '../helpers';
import { BaseRpcContext } from './base-rpc.context';

type LocalDomainContextArgs = [LocalDomainSocket, string];

/**
 * @publicApi
 */
export class LocalDomainContext extends BaseRpcContext<LocalDomainContextArgs> {
  constructor(args: LocalDomainContextArgs) {
    super(args);
  }

  /**
   * Returns the underlying JSON socket.
   */
  getSocketRef() {
    return this.args[0];
  }

  /**
   * Returns the name of the pattern.
   */
  getPattern() {
    return this.args[1];
  }
}
