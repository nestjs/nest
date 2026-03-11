import {
  createTRPCClient,
  httpBatchLink,
  httpSubscriptionLink,
  splitLink,
} from '@trpc/client';
import { EventSource } from 'eventsource';
import type { AppRouter } from './@generated/server';
import {
  DEMO_API_KEY,
  TRPC_API_KEY_HEADER,
  TRPC_PATH,
  TRPC_REQUEST_ID_HEADER,
} from './common/trpc-context';

const client = createTRPCClient<AppRouter>({
  links: [
    splitLink({
      condition: op => op.type === 'subscription',
      true: httpSubscriptionLink({
        url: `http://localhost:3000${TRPC_PATH}`,
        EventSource,
      }),
      false: httpBatchLink({
        url: `http://localhost:3000${TRPC_PATH}`,
        headers: {
          [TRPC_REQUEST_ID_HEADER]: 'typecheck-client',
          [TRPC_API_KEY_HEADER]: DEMO_API_KEY,
        },
      }),
    }),
  ],
});

async function assertClientTypes() {
  const ping = await client.ping.query();
  const _pingLiteral: 'pong' = ping;

  const whoami = await client.whoami.query();
  const _requestId: string = whoami.requestId;

  const status = await client.uptime.query();
  const _uptime: number = status.uptime;

  const createdCat = await client.cats.create.mutate({
    name: 'Luna',
    age: 1,
    breed: 'Bengal',
  });
  const _catId: number = createdCat.id;

  const maybeUser = await client.users.byId.query({ id: 1 });
  if (maybeUser) {
    const _email: string = maybeUser.email;
  }

  const dtoUser = await client.users.createWithDto.mutate({
    name: 'Neo',
    email: 'neo@example.com',
  });
  const _dtoUserId: number = dtoUser.id;

  client.ticks.subscribe(
    { count: 1 },
    {
      onData(event) {
        const _tick: number = event.tick;
        const _eventRequestId: string = event.requestId;
      },
      onError() {},
      onComplete() {},
    },
  );
}

void assertClientTypes;
