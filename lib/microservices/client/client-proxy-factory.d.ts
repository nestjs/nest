import { ClientMetadata } from '../interfaces/client-metadata.interface';
import { ClientProxy } from './client-proxy';
import { Closeable } from '../interfaces/closeable.interface';
export declare class ClientProxyFactory {
  static create(metadata: ClientMetadata): ClientProxy & Closeable;
}
