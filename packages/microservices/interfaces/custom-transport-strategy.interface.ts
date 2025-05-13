import { TransportId } from './microservice-configuration.interface';

/**
 * @publicApi
 */
export interface CustomTransportStrategy {
  /**
   * Unique transport identifier.
   */
  transportId?: TransportId;
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
