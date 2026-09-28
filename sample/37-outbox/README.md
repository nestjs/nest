### Transactional outbox sample

The application built in the [Transactional outbox](https://docs.nestjs.com/reliability/outbox) tutorial, with [`@nestjs/outbox`](https://github.com/nestjs/outbox): an online store's order API that saves an order and its messages in one database transaction, and a relay that publishes them after the commit.

- `POST /orders` saves the order and its messages in one transaction.
- Two in-process handlers send the confirmation email and reserve stock.
- A separate analytics microservice, with a database of its own, receives order events over TCP, in order for each order.
- Failures are retried, and a small admin API lists, requeues and purges dead letters.

### What is where

| Path | Contents |
| --- | --- |
| `src/` | The order API, on PostgreSQL with Drizzle (`@nestjs/drizzle`) |
| `src/database/` | The Drizzle schema, with the outbox's three tables, and `DrizzleOutboxStore` |
| `src/orders/` | `OrdersService` adds the messages through the order's transaction |
| `src/notifications/`, `src/inventory/` | The `@OnOutboxMessage()` handlers |
| `src/outbox-admin/` | The dead-letter routes and the outbox's stats |
| `drizzle/` | The order API's migrations, written by drizzle-kit |
| `analytics-service/` | The analytics microservice: its schema, migrations, inbox store and TCP consumer |
| `e2e/` | The tests |

### Installation

`npm install`

### Running

This example requires docker or a local PostgreSQL installation, with two databases: `store` for the order API and `analytics` for the analytics service.

#### Docker

There is a `docker-compose.yml` file for starting Docker, which creates both databases.

`docker-compose up`

After running the sample, you can stop the Docker container with

`docker-compose down`

#### Migrations

Apply each service's migrations:

```bash
$ DATABASE_URL=postgres://postgres:postgres@localhost:5432/store npx drizzle-kit migrate
$ DATABASE_URL=postgres://postgres:postgres@localhost:5432/analytics npx drizzle-kit migrate --config analytics-service/drizzle.config.ts
```

### Run the sample

Start the analytics service (TCP port 4001), then the order API (port 3000), each in its own terminal:

```bash
$ DATABASE_URL=postgres://postgres:postgres@localhost:5432/analytics npm run start:analytics
$ DATABASE_URL=postgres://postgres:postgres@localhost:5432/store ADMIN_TOKEN=s3cret npm run start
```

Each logs the store it registered when it starts:

```bash
[Nest] 46426  - 09/25/2026, 8:56:39 AM     LOG [OutboxModule] OutboxStorage: DrizzleOutboxStore
[Nest] 46425  - 09/25/2026, 8:56:38 AM     LOG [OutboxModule] OutboxStorage: DrizzleInboxStore (inbox)
```

| Variable | Used by | Meaning |
| --- | --- | --- |
| `DATABASE_URL` | Both | The service's own database |
| `ADMIN_TOKEN` | Order API | The `x-admin-token` header that the `/admin/outbox` routes expect |
| `ANALYTICS_HOST`, `ANALYTICS_PORT` | Order API | Where the analytics service listens (`127.0.0.1`, `4001`) |
| `OUTBOX_RELAY` | Order API | `off` starts an instance that adds messages without publishing them |
| `PORT` | Both | The port to listen on (`3000` for the order API, `4001` for the analytics service) |

### Try it

Place an order. The order API logs the two in-process handlers, and the analytics service logs the revenue:

```bash
$ curl -X POST localhost:3000/orders \
    -H 'Content-Type: application/json' \
    -d '{"userId":"user-42","items":[{"productId":"salmon-kibble-2kg","quantity":2}]}'
```

Order two bags of clumping litter, which has one in stock. The order is accepted, the confirmation email goes out, and the reservation is dead-lettered on its first attempt:

```bash
$ curl -X POST localhost:3000/orders \
    -H 'Content-Type: application/json' \
    -d '{"userId":"user-7","items":[{"productId":"clumping-litter-10l","quantity":2}]}'
$ curl localhost:3000/admin/outbox/dead-letters -H 'x-admin-token: s3cret'
```

Restock, then requeue the message by its id. The reservation goes through, and no second email is sent:

```bash
$ docker-compose exec postgres psql -U postgres -d store \
    -c "UPDATE products SET in_stock = in_stock + 5 WHERE id = 'clumping-litter-10l'"
$ curl -X POST localhost:3000/admin/outbox/dead-letters/<id>/requeue -H 'x-admin-token: s3cret'
```

Stop the analytics service, then place an order and cancel it. Both analytics messages stay pending, and are published in order once the service is back:

```bash
$ curl -X POST localhost:3000/orders/<order id>/cancel
$ curl localhost:3000/admin/outbox/stats -H 'x-admin-token: s3cret'
```

### Tests

`npm run test:e2e`

| Test | Runs on |
| --- | --- |
| `orders.e2e-spec.ts`: the order API, with the relay driven by the test | PGlite |
| `analytics.e2e-spec.ts`: the analytics service, over TCP | PGlite |
| `drizzle-outbox.store.e2e-spec.ts`: the store contract suites of `@nestjs/outbox/testing` | PGlite, and PostgreSQL |

[PGlite](https://pglite.dev) is PostgreSQL in the test's process, so those tests need nothing else. The store suites also run on a server, where transactions really overlap, and are skipped without one. Point them at the container:

```bash
$ SQL_TEST_PG_URL=postgres://postgres:postgres@localhost:5432/postgres npm run test:e2e
```

They create databases of their own on that server, and drop them afterwards.
