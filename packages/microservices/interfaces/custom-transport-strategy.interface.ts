import { Transport } from '../enums';

/**
 * @publicApi
 */
export interface CustomTransportStrategy {
  /**
   * Unique transport identifier.
   */
  readonly transportId?: Transport | symbol;
  /**
   * Method called when the transport is being initialized.
   * @param callback Function to be called upon initialization
   */
  listen(callback: (...optionalParams: unknown[]) => any): any;
  /**
   * Method called when the transport is being terminated.
   */
  close(): any;
}
