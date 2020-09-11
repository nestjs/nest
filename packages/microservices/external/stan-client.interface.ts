import { EventEmitter } from 'events';

/**
 * @see https://github.com/nats-io/stan.js
 */
export declare class Client extends EventEmitter {
  /**
   * Close the connection to the server.
   */
  close(): void;

  /**
   * Publishes a message to the streaming server with the specified subject and data.
   * @param subject
   * @param data
   * @param callback
   * @returns guid generated for the published message
   */
  publish(
    subject: string,
    data?: Uint8Array | string | Buffer,
    callback?: AckHandlerCallback,
  ): string;

  /**
   * Subscribes to a given subject as an optional member of a queue group.
   * @param subject
   * @param qGroup
   * @param opts
   */
  subscribe(subject: string, opts?: SubscriptionOptions): Subscription;
  subscribe(
    subject: string,
    qGroup: string,
    opts?: SubscriptionOptions,
  ): Subscription;

  /**
   * Returns a SubscriptionOptions initialized to defaults
   */
  subscriptionOptions(): SubscriptionOptions;
}

declare class Subscription extends EventEmitter {
  /**
   * Returns true if the subscription has been closed or unsubscribed from.
   */
  isClosed(): boolean;

  /**
   * Unregisters the subscription from the streaming server.
   */
  unsubscribe(): void;

  /**
   * Close removes the subscriber from the server, but unlike the Subscription#unsubscribe(),
   * the durable interest is not removed. If the client has connected to a server
   * for which this feature is not available, Subscription#Close() will emit a
   * Subscription#error(NO_SERVER_SUPPORT) error. Note that this affects durable clients only.
   * If called on a non-durable subscriber, this is equivalent to Subscription#close()
   */
  close(): void;
}

interface AckHandlerCallback {
  (err: Error | undefined, guid: string): void;
}

declare enum StartPosition {
  NEW_ONLY = 0,
  LAST_RECEIVED,
  TIME_DELTA_START,
  SEQUENCE_START,
  FIRST,
}

export declare interface SubscriptionOptions {
  durableName?: string;
  maxInFlight?: number;
  ackWait?: number;
  startPosition: StartPosition;
  startSequence?: number;
  startTime?: number;
  manualAcks?: boolean;

  /**
   * Sets the maximun number of unacknowledged messages that the streaming server will allow
   * before it sends a message.
   * @param n
   */
  setMaxInFlight(n: number): SubscriptionOptions;

  /**
   * Sets the number of milliseconds before a message is considered unacknowledged by
   * the streaming server.
   */
  setAckWait(millis: number): SubscriptionOptions;

  /**
   * Configures the subscription start mode.
   * Typically you would invoke this message with StartPostion#FIRST, StartPosition#NEW_ONLY or
   * StartPosition#LAST_RECEIVED. For all other uses (SubscriptionOptions#setStartSequence,
   * SubscriptionOptions#setStartTime, SubscriptionOptions#setStartAtTimeDelta, or
   * SubscriptionOptions#setStartWithLastReceived), the  method will configure
   * the startup value and position.
   *
   * @param startPosition
   */
  setStartAt(startPosition: StartPosition): SubscriptionOptions;

  /**
   * Configures the subscription to start with the message having the specified
   * sequence number.
   *
   * @param sequence
   */
  setStartAtSequence(sequence: number): SubscriptionOptions;

  /**
   * Configures the subscription to start with messages sent at the specified date.
   * @param date
   */
  setStartTime(date: Date): SubscriptionOptions;

  /**
   * Configures the subscription to replay  messages sent milliseconds ago.
   * @param millis - the number of milliseconds ago to use as the start time
   */
  setStartAtTimeDelta(millis: number): SubscriptionOptions;

  /**
   * Configures the subscription to replay with the last received message.
   */
  setStartWithLastReceived(): SubscriptionOptions;

  /**
   * Configures the subscription to replay from first available message.
   */
  setDeliverAllAvailable(): SubscriptionOptions;

  /**
   * Configures the subscription to require manual acknowledgement of messages
   * using Message#acknowledge.
   * @param tf - true if manual acknowlegement is required.
   */
  setManualAckMode(tf: boolean): SubscriptionOptions;

  /**
   * Sets a durable subscription name that the client can specify for the subscription.
   * This enables the subscriber to close the connection without canceling the subscription and
   * resume the subscription with same durable name. Note the server will resume the
   * subscription with messages
   * that have not been acknowledged.
   *
   * @param durableName
   */
  setDurableName(durableName: string): SubscriptionOptions;
}

export declare class Message {
  /**
   * Returns the subject associated with this Message
   */
  getSubject(): string;

  /**
   * Returns the sequence number of the message in the stream.
   */
  getSequence(): number;

  /**
   * Returns a Buffer with the raw message payload
   */
  getRawData(): Buffer;

  /**
   * Returns the data associated with the message payload. If the stanEncoding is not
   * set to 'binary', a string is returned.
   */
  getData(): String | Buffer;

  /**
   * Returns the raw timestamp set on the message. This number is not a valid time in JavaScript.
   */
  getTimestampRaw(): number;

  /**
   * Returns a Date object representing the timestamp of the message. This is an approximation of the timestamp.
   */
  getTimestamp(): Date;

  /**
   * Returns a boolean indicating if the message is being redelivered
   */
  isRedelivered(): boolean;

  /**
   * Returns an optional IEEE CRC32 checksum
   */
  getCrc32(): number;

  /**
   * Acks the message, note this method shouldn't be called unless
   * the manualAcks option was set on the subscription.
   */
  ack(): void;
}
