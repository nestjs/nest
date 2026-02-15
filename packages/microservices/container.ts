import { ClientProxy } from './client/client-proxy.js';

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
