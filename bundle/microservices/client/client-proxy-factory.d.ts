import { ClientOptions } from '../interfaces/client-metadata.interface';
import { Closeable } from '../interfaces/closeable.interface';
import { ClientProxy } from './client-proxy';
export declare class ClientProxyFactory {
    static create(clientOptions: ClientOptions): ClientProxy & Closeable;
}
