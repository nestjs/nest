import { isObject } from '@nestjs/common/internal';
import { PacketMetadata } from '../interfaces/packet.interface.js';
import { toPacketMetadata } from '../utils/packet-metadata.utils.js';
import { BaseRpcContext } from './base-rpc.context.js';

type MqttContextArgs = [string, Record<string, any>];

/**
 * @publicApi
 */
export class MqttContext extends BaseRpcContext<MqttContextArgs> {
  constructor(args: MqttContextArgs) {
    super(args);
  }

  /**
   * Returns the name of the topic.
   */
  getTopic() {
    return this.args[0];
  }

  /**
   * Returns the reference to the original MQTT packet.
   */
  getPacket() {
    return this.args[1];
  }

  /**
   * Returns the packet's MQTT 5 user properties as packet metadata: what the
   * client attached to the packet, and every other user property with a
   * single value. A property with several values is only available through
   * `getPacket()`. MQTT 3 has no user properties, so there is nothing to
   * return over it.
   */
  getMetadata(): PacketMetadata | undefined {
    const userProperties: unknown = this.args[1]?.properties?.userProperties;
    return isObject(userProperties)
      ? toPacketMetadata(Object.entries(userProperties))
      : undefined;
  }
}
