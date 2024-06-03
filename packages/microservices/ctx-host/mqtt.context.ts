import { BaseRpcContext } from './base-rpc.context';

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
}
