import { ClientProxy } from './client/client-proxy';

export class ClientsContainer {
  private clients: ClientProxy[] = [];

  public getAllClients(): ClientProxy[] {
    return this.clients;
  }

  public addClient(client: ClientProxy) {
    this.clients.push(client);
  }

  public clear() {
    this.clients = [];
  }
}
