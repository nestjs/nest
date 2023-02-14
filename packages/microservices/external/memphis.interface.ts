export interface MemphisConsumerOptions {
  /** The name of the station to consume messages from. */
  stationName: string;
  /** The name of the consumer. */
  consumerName: string;
  /** Name of the group this consumer belongs to. Defaults to consumerName. */
  consumerGroup?: string;
  /** Interval in milliseconds between pulls. The default is 1000 ms. */
  pullIntervalMs?: number;
  /** Pull batch size. */
  batchSize?: number;
  /** Max time in milliseconds to wait between pulls. The default is 5000 ms. */
  batchMaxTimeToWaitMs?: number;
  /**
   * Max time to ack a message in milliseconds.
   *
   * In case a message is not acked within this time period, the Memphis broker
   * will resend it until it reaches maxMsgDeliveries.
   */
  maxAckTimeMs?: number;
  /** Max number of message deliveries. The default is 10 */
  maxMsgDeliveries?: number;
  /** Tells Memphis to add a unique suffix to the consumer's name. */
  genUniqueSuffix?: boolean;
  /** Start consuming from a specific sequence. The default is 1 */
  startConsumeFromSequence?: number;
  /**
   * Consume the last N messages.
   * Defaults to -1 (all messages in the station).
   */
  lastMessages?: number;
}

export interface MemphisStationOptions {
  /** The station's name */
  name: string;
  /**
   * Default is MAX_MESSAGE_AGE_SECONDS.
   * Other options include: MESSAGES and BYTES
   */
  retentionType?: string;
  /**
   * Number which represents the retention based on the retentionType.
   * Default is 604800.
   */
  retentionValue?: number;
  /**
   * Persistance storage for messages of the station.
   * Default is storageTypes.DISK. Other option is storageTypes.MEMORY
   */
  storageType?: string;
  /** Number of replicas for the messages of the data. Dfault is 1. */
  replicas?: number;
  /** Time frame in which idempotent  */
  idempotencyWindowMs?: number;
  /**
   * Time frame in which idempotent messages will be tracked,
   * happens based on message ID Defaults to 120000.
   */
  schemaName?: string;
  sendPoisonMsgToDls?: boolean;
  sendSchemaFailedMsgToDls?: boolean;
}
