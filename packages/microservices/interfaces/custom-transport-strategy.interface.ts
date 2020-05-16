import { Transport } from '../enums';

export interface CustomTransportStrategy {
  readonly transportId?: Transport;
  listen(callback: () => void): any;
  close(): any;
}
