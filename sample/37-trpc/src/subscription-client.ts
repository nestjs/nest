import {
  createTRPCClient,
  httpBatchLink,
  httpSubscriptionLink,
  splitLink,
} from '@trpc/client';
import { EventSource } from 'eventsource';
import type { AppRouter } from './@generated/server';
import {
  TRPC_API_KEY_HEADER,
  TRPC_PATH,
  TRPC_REQUEST_ID_HEADER,
  DEMO_API_KEY,
} from './common/trpc-context';

const client = createTRPCClient<AppRouter>({
  links: [
    splitLink({
      condition: op => op.type === 'subscription',
      true: httpSubscriptionLink({
        url: `http://localhost:3000${TRPC_PATH}`,
        EventSource,
        eventSourceOptions: {
          withCredentials: false,
        },
      }),
      false: httpBatchLink({
        url: `http://localhost:3000${TRPC_PATH}`,
        headers: {
          [TRPC_REQUEST_ID_HEADER]: 'demo-sub-client',
          [TRPC_API_KEY_HEADER]: DEMO_API_KEY,
        },
      }),
    }),
  ],
});

async function main() {
  console.log('Subscribing to ticks...');

  await new Promise<void>((resolve, reject) => {
    const requestedCount = 3;
    let received = 0;
    let subscription:
      | {
          unsubscribe: () => void;
        }
      | undefined;

    subscription = client.ticks.subscribe(
      { count: requestedCount },
      {
        onData(data) {
          console.log('tick event:', data);
          received += 1;
          if (received >= requestedCount) {
            subscription?.unsubscribe();
            resolve();
          }
        },
        onError(error) {
          subscription?.unsubscribe();
          reject(error);
        },
        onComplete() {
          resolve();
        },
      },
    );
  });

  console.log('Subscription completed.');
}

main().catch(console.error);
