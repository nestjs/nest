import { Transport } from '../enums';

/**
 * @publicApi
 */
export interface CustomTransportStrategy {
  readonly transportId?: Transport | symbol;
  listen(callback: (...optionalParams: unknown[]) => any): any;
  close(): any;
}
