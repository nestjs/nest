export interface CustomTransportStrategy {
  listen(callback: () => void): any;
  getTransport(): number;
  close(): any;
}
