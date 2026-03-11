/**
 * Example tRPC client demonstrating end-to-end type safety.
 *
 * After the server starts (which generates `src/@generated/server.ts`),
 * this client gets full autocompletion and type checking for all procedures.
 *
 * Usage:
 *   1. Start the server:  npm run start
 *   2. Run the client:    npx ts-node src/client.ts
 */
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from './@generated/server';
import {
  DEMO_API_KEY,
  TRPC_API_KEY_HEADER,
  TRPC_PATH,
  TRPC_REQUEST_ID_HEADER,
} from './common/trpc-context';

const client = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `http://localhost:3000${TRPC_PATH}`,
      headers: {
        [TRPC_REQUEST_ID_HEADER]: 'demo-client',
        [TRPC_API_KEY_HEADER]: DEMO_API_KEY,
      },
    }),
  ],
});

async function main() {
  // Health check (flat router — root-level procedures)
  console.log('=== Health ===');
  const pong = await client.ping.query();
  console.log('ping:', pong);

  const caller = await client.whoami.query();
  console.log('whoami:', caller);

  const status = await client.uptime.query();
  console.log('uptime:', status);

  // Cats (aliased sub-router)
  console.log('\n=== Cats ===');
  const cats = await client.cats.list.query({});
  console.log('all cats:', cats);

  const siamese = await client.cats.list.query({ breed: 'Siamese' });
  console.log('siamese:', siamese);

  const cat = await client.cats.byId.query({ id: 1 });
  console.log('cat #1:', cat);

  const newCat = await client.cats.create.mutate({
    name: 'Luna',
    age: 1,
    breed: 'Bengal',
  });
  console.log('created:', newCat);

  const updated = await client.cats.update.mutate({
    id: newCat.id,
    name: 'Luna Star',
  });
  console.log('updated:', updated);

  // Users (aliased sub-router)
  console.log('\n=== Users ===');
  const users = await client.users.list.query();
  console.log('all users:', users);

  const alice = await client.users.byId.query({ id: 1 });
  console.log('user #1:', alice);

  const found = await client.users.search.query({ query: 'alice' });
  console.log('search "alice":', found);

  const newUser = await client.users.create.mutate({
    name: 'Diana',
    email: 'diana@example.com',
    role: 'moderator',
  });
  console.log('created user:', newUser);

  const dtoUser = await client.users.createWithDto.mutate({
    name: 'Evan',
    email: 'evan@example.com',
    role: 'user',
  });
  console.log('created user (class-validator DTO):', dtoUser);

  console.log('\nDone!');
}

main().catch(console.error);
