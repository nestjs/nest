import { JsonSocket } from '../helpers';
import { BaseRpcContext } from './base-rpc.context';

type TcpContextArgs = [JsonSocket];

export class TcpContext extends BaseRpcContext<TcpContextArgs> {
  constructor(args: TcpContextArgs) {
    super(args);
  }

  /**
   * Returns the underlying JSON socket.
   */
  getSocketRef() {
    return this.args[0];
  }
}
