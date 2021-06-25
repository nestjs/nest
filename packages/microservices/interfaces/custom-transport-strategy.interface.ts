import { Transport } from '../enums';

export interface CustomTransportStrategy {
  readonly transportId?: Transport;
  listen(callback: (...optionalParams: unknown[]) => any): any;
  close(): any;
}
