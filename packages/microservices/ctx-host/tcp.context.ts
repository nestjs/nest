import { TcpSocket } from '../helpers/index.js';
import { PacketMetadata } from '../interfaces/packet.interface.js';
import { BaseRpcContext } from './base-rpc.context.js';

type TcpContextArgs = [TcpSocket, string, PacketMetadata?];

/**
 * @publicApi
 */
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

  /**
   * Returns the name of the pattern.
   */
  getPattern() {
    return this.args[1];
  }

  /**
   * Returns the metadata the client attached to the packet, if any.
   */
  getMetadata(): PacketMetadata | undefined {
    return this.args[2];
  }
}
