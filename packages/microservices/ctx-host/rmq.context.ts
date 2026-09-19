import { PacketMetadata } from '../interfaces/packet.interface.js';

import { BaseRpcContext } from './base-rpc.context.js';

type RmqContextArgs = [Record<string, any>, any, string, PacketMetadata?];

/**
 * @publicApi
 */
export class RmqContext extends BaseRpcContext<RmqContextArgs> {
  constructor(args: RmqContextArgs) {
    super(args);
  }

  /**
   * Returns the original message (with properties, fields, and content).
   */
  getMessage() {
    return this.args[0];
  }

  /**
   * Returns the reference to the original RMQ channel.
   */
  getChannelRef() {
    return this.args[1];
  }

  /**
   * Returns the name of the pattern.
   */
  getPattern() {
    return this.args[2];
  }

  /**
   * Returns the metadata the client attached to the packet, if any.
   */
  getMetadata(): PacketMetadata | undefined {
    return this.args[3];
  }
}
