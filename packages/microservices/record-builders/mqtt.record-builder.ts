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

export class MqttRecord<TData = any> {
  constructor(
    public readonly data: TData,
    public options?: MqttRecordOptions,
  ) {}
}

export class MqttRecordBuilder<TData> {
  private options?: MqttRecordOptions;

  constructor(private data?: TData) {}

  public setData(data: TData): this {
    this.data = data;
    return this;
  }

  public setQoS(qos: MqttRecordOptions['qos']): this {
    this.options = {
      ...this.options,
      qos,
    };
    return this;
  }

  public setRetain(retain: MqttRecordOptions['retain']): this {
    this.options = {
      ...this.options,
      retain,
    };
    return this;
  }

  public setDup(dup: MqttRecordOptions['dup']): this {
    this.options = {
      ...this.options,
      dup,
    };
    return this;
  }

  public setProperties(properties: MqttRecordOptions['properties']): this {
    this.options = {
      ...this.options,
      properties,
    };
    return this;
  }

  public build(): MqttRecord {
    return new MqttRecord(this.data, this.options);
  }
}
