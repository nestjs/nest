import * as WebSocket from 'ws';
import { Module, DynamicModule, Inject, OnModuleDestroy } from '@nestjs/common';
import { SubscriptionServer, ServerOptions } from 'subscriptions-transport-ws';
import { execute, subscribe } from 'graphql';

import { createSubscriptionProviders } from './subscription.providers';
import { SUBSCRIPTION_SERVER } from './subscription.constants';

@Module({
  exports: [SubscriptionsModule],
})
export class SubscriptionsModule implements OnModuleDestroy {
  private subscriptionServer: SubscriptionServer;

  constructor(@Inject(SUBSCRIPTION_SERVER) private readonly ws) {}

  static forRoot(port: number = 3001): DynamicModule {
    const providers = createSubscriptionProviders(port);
    return {
      module: SubscriptionsModule,
      providers: [...providers],
      exports: [...providers],
    };
  }

  createSubscriptionServer(
    schema: any,
    options: ServerOptions = {},
    socketOptions: WebSocket.ServerOption = {},
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
