import { ClientProxy } from './client/client-proxy';
import { Closeable } from './interfaces/closeable.interface';
export declare type CloseableClient = Closeable & ClientProxy;
export declare class ClientsContainer {
    private clients;
    getAllClients(): CloseableClient[];
    addClient(client: CloseableClient): void;
    clear(): void;
}
