import { EventEmitter } from 'events';

/**
 * @see https://github.com/nats-io/node-nats
 */
export declare class Client extends EventEmitter {
  /**
   * Create a properly formatted inbox subject.
   */
  createInbox(): string;

  /**
   * Close the connection to the server.
   */
  close(): void;

  /**
   * Flush outbound queue to server and call optional callback when server has processed
   * all data.
   */
  flush(callback?: Function): void;

  /**
   * Publish a message to the given subject, with optional reply and callback.
   */
  publish(callback: Function): void;
  publish(subject: string, callback: Function): void;
  publish(subject: string, msg: string | Buffer, callback: Function): void;
  publish(
    subject: string,
    msg?: string | Buffer,
    reply?: string,
    callback?: Function,
  ): void;

  /**
   * Subscribe to a given subject, with optional options and callback. opts can be
   * ommitted, even with a callback. The Subscriber Id is returned.
   */
  subscribe(subject: string, callback: Function): number;
  subscribe(subject: string, opts: any, callback: Function): number;

  /**
   * Unsubscribe to a given Subscriber Id, with optional max parameter.
   */
  unsubscribe(sid: number, max?: number): void;

  /**
   * Set a timeout on a subscription.
   */
  timeout(
    sid: number,
    timeout: number,
    expected: number,
    callback: (sid: number) => void,
  ): void;

  /**
   * Publish a message with an implicit inbox listener as the reply. Message is optional.
   * This should be treated as a subscription. You can optionally indicate how many
   * messages you only want to receive using opt_options = {max:N}. Otherwise you
   * will need to unsubscribe to stop the message stream.
   * The Subscriber Id is returned.
   */
  request(subject: string, callback: Function): number;
  request(subject: string, msg: string | Buffer, callback: Function): number;
  request(
    subject: string,
    msg?: string,
    options?: any,
    callback?: Function,
  ): number;

  /**
   * Publish a message with an implicit inbox listener as the reply. Message is optional.
   * This should be treated as a subscription. Request one, will terminate the subscription
   * after the first response is received or the timeout is reached.
   * The callback can be called with either a message payload or a NatsError to indicate
   * a timeout has been reached.
   * The Subscriber Id is returned.
   */
  requestOne(
    subject: string,
    msg: string | Buffer,
    options?: any,
    timeout?: number,
    callback?: Function,
  ): number;

  /**
   * Report number of outstanding subscriptions on this connection.
   */
  numSubscriptions(): number;
}
