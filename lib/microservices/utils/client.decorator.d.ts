import 'reflect-metadata';
import { ClientMetadata } from '../interfaces/client-metadata.interface';
/**
 * Attaches the `ClientProxy` instance to the given property
 *
 * @param  {ClientMetadata} metadata Optional client metadata
 * ```
 * transport?: Transport;
 * url?: string;
 * port?: number;
 * host?: string;
 */
export declare const Client: (
  metadata?: ClientMetadata
) => (target: object, propertyKey: string | symbol) => void;
