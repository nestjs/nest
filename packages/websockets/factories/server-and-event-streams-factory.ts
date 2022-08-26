import { ReplaySubject, Subject } from 'rxjs';
import { ServerAndEventStreamsHost } from '../interfaces/server-and-event-streams-host.interface';
import { WebSocketAdapter } from '@nestjs/common';
import { ClientAndEventStreamsHost } from '../interfaces/client-and-event-streams-host.interface';

export class ServerAndEventStreamsFactory {
  public static create<T = any>(
    adapter: WebSocketAdapter,
    server: T,
  ): ServerAndEventStreamsHost<T> {
    const init = new ReplaySubject<T>();
    init.next(server);

    const connection = new Subject<ClientAndEventStreamsHost<T>>();
    const handler = this.getConnectionHandler(adapter, connection);
    adapter.bindClientConnect(server, handler);

    return {
      server,
      init,
      connection,
    };
  }

  private static getConnectionHandler(
    adapter: WebSocketAdapter,
    connection: Subject<ClientAndEventStreamsHost>,
  ) {
    return (client: any, request?: any) => {
      const observableClient = this.createObservableClient(
        adapter,
        client,
        request,
      );

      connection.next(observableClient);
    };
  }

  public static createObservableClient<TClient = any, TRequest = any>(
    adapter: WebSocketAdapter,
    client: TClient,
    request?: TRequest,
  ): ClientAndEventStreamsHost<TClient, TRequest> {
    const disconnect = new Subject<TClient>();

    const observableClient = {
      client,
      request,
      disconnect,
    };

    const disconnectHook = adapter.bindClientDisconnect;
    disconnectHook &&
      disconnectHook.call(adapter, client, () => disconnect.next(client));

    return observableClient;
  }
}
