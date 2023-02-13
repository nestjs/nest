export interface MemphisConsumerOptions {
  stationName: string;
  consumerName: string;
  consumerGroup?: string;
  pullIntervalMs?: number;
  batchSize?: number;
  batchMaxTimeToWaitMs?: number;
  maxAckTimeMs?: number;
  maxMsgDeliveries?: number;
  genUniqueSuffix?: boolean;
}
