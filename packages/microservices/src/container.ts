import { ClientProxy } from './client/client-proxy';
import { Closeable } from './interfaces/closeable.interface';

export type CloseableClient = Closeable & ClientProxy;

export class ClientsContainer {
  private clients: CloseableClient[] = [];

  public getAllClients(): CloseableClient[] {
    return this.clients;
  }

  public addClient(client: CloseableClient) {
    this.clients.push(client);
  }

  public clear() {
    this.clients = [];
  }
}
