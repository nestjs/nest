import { PacketMetadata } from '../interfaces/packet.interface.js';

import { BaseRpcContext } from './base-rpc.context.js';

type NatsContextArgs = [string, any, PacketMetadata?];

/**
 * @publicApi
 */
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

  /**
   * Returns the metadata the client attached to the packet, if any.
   */
  getMetadata(): PacketMetadata | undefined {
    return this.args[2];
  }
}
