import { isFunction } from '@nestjs/common/internal';
import { PacketMetadata } from '../interfaces/packet.interface.js';
import { toPacketMetadata } from '../utils/packet-metadata.utils.js';
import { BaseRpcContext } from './base-rpc.context.js';

type NatsContextArgs = [string, any];

type MsgHdrs = { keys(): string[]; values(key: string): string[] };

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
   * Returns the message headers as packet metadata: what the client attached
   * to the packet, and every other header with a single value. A header with
   * several values is only available through `getHeaders()`.
   */
  getMetadata(): PacketMetadata | undefined {
    const headers = this.args[1] as MsgHdrs | undefined;
    if (!isFunction(headers?.keys) || !isFunction(headers?.values)) {
      return undefined;
    }
    return toPacketMetadata(
      headers.keys().map(key => {
        const values = headers.values(key);
        return [key, values.length === 1 ? values[0] : undefined];
      }),
    );
  }
}
