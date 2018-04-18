import * as WebSocket from 'ws';
import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import { SUBSCRIPTION_SERVER } from './subscription.constants';
import { ServerOptions, SubscriptionServer } from 'subscriptions-transport-ws';
import { execute, subscribe } from 'graphql';

@Injectable()
export class SubscriptionsService implements OnModuleDestroy {
  private subscriptionServer: SubscriptionServer;

  constructor(@Inject(SUBSCRIPTION_SERVER) private readonly ws) {}
  
  createSubscriptionServer(
    schema: any,
    options: ServerOptions = {},
    socketOptions: WebSocket.ServerOptions = {},
  ) {
    this.subscriptionServer = new SubscriptionServer(
      {
        execute,
        subscribe,
        schema,
        ...options,
      },
      {
        server: this.ws,
        path: '/subscriptions',
        ...socketOptions,
      },
    );
  }

  onModuleDestroy() {
    this.ws.close();
  }
}
