export interface RmqRecordOptions {
  expiration?: string | number;
  userId?: string;
  CC?: string | string[];
  mandatory?: boolean;
  persistent?: boolean;
  deliveryMode?: boolean | number;
  BCC?: string | string[];
  contentType?: string;
  contentEncoding?: string;
  headers?: Record<string, string>;
  priority?: number;
  messageId?: string;
  timestamp?: number;
  type?: string;
  appId?: string;
}

export class RmqRecord<TData = any> {
  constructor(public readonly data: TData, public options?: RmqRecordOptions) {}
}

export class RmqRecordBuilder<TData> {
  private options?: RmqRecordOptions;

  constructor(private data?: TData) {}

  public setOptions(options: RmqRecordOptions): this {
    this.options = options;
    return this;
  }

  public setData(data: TData): this {
    this.data = data;
    return this;
  }

  public build(): RmqRecord {
    return new RmqRecord(this.data, this.options);
  }
}
