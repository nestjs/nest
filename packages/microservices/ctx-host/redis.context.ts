import { PacketMetadata } from '../interfaces/packet.interface.js';
import { BaseRpcContext } from './base-rpc.context.js';

type RedisContextArgs = [string, PacketMetadata?];

/**
 * @publicApi
 */
export class RedisContext extends BaseRpcContext<RedisContextArgs> {
  constructor(args: RedisContextArgs) {
    super(args);
  }

  /**
   * Returns the name of the channel.
   */
  getChannel() {
    return this.args[0];
  }

  /**
   * Returns the metadata the client attached to the packet, if any.
   */
  getMetadata(): PacketMetadata | undefined {
    return this.args[1];
  }
}
