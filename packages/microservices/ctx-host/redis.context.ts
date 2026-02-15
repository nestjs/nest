import { BaseRpcContext } from './base-rpc.context.js';

type RedisContextArgs = [string];

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
}
