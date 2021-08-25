import { RecordWrapper } from './record-wrapper';

export interface MqttRecordOptions {
  /**
   * The QoS
   */
  qos?: 0 | 1 | 2;
  /**
   * The retain flag
   */
  retain?: boolean;
  /**
   * Whether or not mark a message as duplicate
   */
  dup?: boolean;
  /*
   *  MQTT 5.0 properties object
   */
  properties?: {
    payloadFormatIndicator?: number;
    messageExpiryInterval?: number;
    topicAlias?: string;
    responseTopic?: string;
    correlationData?: Buffer;
    userProperties?: Record<string, string | string[]>;
    subscriptionIdentifier?: number;
    contentType?: string;
  };
}

export class MqttRecord<T = any> extends RecordWrapper<T, MqttRecordOptions> {
  setQoS(qos: MqttRecordOptions['qos']) {
    this.updateOptions({ qos });
  }

  setRetain(retain: MqttRecordOptions['retain']) {
    this.updateOptions({ retain });
  }

  setDup(dup: MqttRecordOptions['dup']) {
    this.updateOptions({ dup });
  }

  setProperties(properties: MqttRecordOptions['properties']) {
    this.updateOptions({ properties });
  }
}
