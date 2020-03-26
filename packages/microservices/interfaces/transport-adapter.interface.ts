export interface TransportAdapter<TransportFormat, AppFormat = {}> {
  encode(value: AppFormat, options?: any): TransportFormat;
  decode(body: TransportFormat, options?: any): AppFormat;
}
