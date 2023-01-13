export interface StreamableHandlerResponse {
  destroyed: boolean;
  statusCode: number;
  send: (msg: string) => void;
}
