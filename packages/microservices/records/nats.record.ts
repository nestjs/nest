import { RecordWrapper } from './record-wrapper';

export interface NatsRecordOptions {
  headers: any;
}

export class NatsRecord<T = any> extends RecordWrapper<T, NatsRecordOptions> {
  setHeaders(headers: NatsRecordOptions['headers']) {
    this.updateOptions({ headers });
  }
}
