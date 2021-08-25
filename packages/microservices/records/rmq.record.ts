import { RecordWrapper } from './record-wrapper';

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
  headers?: any;
  priority?: number;
  messageId?: string;
  timestamp?: number;
  type?: string;
  appId?: string;
}

export class RmqRecord<T = any> extends RecordWrapper<T, RmqRecordOptions> {
  setOptions(options: RmqRecordOptions) {
    this.updateOptions(options);
  }
}
