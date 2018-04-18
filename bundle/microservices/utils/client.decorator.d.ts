import 'reflect-metadata';
import { ClientOptions } from '../interfaces/client-metadata.interface';
/**
 * Attaches the `ClientProxy` instance to the given property
 *
 * @param  {ClientOptions} metadata Optional client metadata
 * ```
 * transport?: Transport;
 * url?: string;
 * port?: number;
 * host?: string;
 */
export declare const Client: (metadata?: ClientOptions) => (target: object, propertyKey: string | symbol) => void;
