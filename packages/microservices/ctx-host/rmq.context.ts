import { isObject } from '@nestjs/common/internal';
import { PacketMetadata } from '../interfaces/packet.interface.js';
import { toPacketMetadata } from '../utils/packet-metadata.utils.js';
import { BaseRpcContext } from './base-rpc.context.js';

type RmqContextArgs = [Record<string, any>, any, string];

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
   * Returns the message's `headers` property as packet metadata: what the
   * client attached to the packet, and every other header with a string
   * value. Headers of any other type (numbers, tables, arrays) are only
   * available through `getMessage()`.
   */
  getMetadata(): PacketMetadata | undefined {
    const headers: unknown = this.args[0]?.properties?.headers;
    return isObject(headers)
      ? toPacketMetadata(Object.entries(headers))
      : undefined;
  }
}
