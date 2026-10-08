### Webhooks sample

The application built in the [Webhooks](https://docs.nestjs.com/http/webhooks) tutorial, with [`@nestjs/webhooks`](https://github.com/nestjs/webhooks): an online store's order API that sends webhooks to the partners who buy from it, and receives webhooks from its payment provider and its carrier.

- Partners subscribe to `order.shipped` and `order.cancelled`, and see their secret once.
- The API dispatches a webhook in the order's transaction. After the commit, the [outbox](https://docs.nestjs.com/reliability/outbox) hands it to a worker that signs it ([Standard Webhooks](https://www.standardwebhooks.com)) and retries while the partner is down.
- Partners read their delivery log and ask for a replay.
- The payment provider's webhooks (Standard Webhooks) and the carrier's (Stripe's scheme) are verified on the raw body and processed exactly once.
- `partner-service/` is the receiver of Northside Pet Supplies, one of the partners: a second Nest application that verifies the store's webhooks.

The sample covers the tutorial's main path: DTOs with `class-validator`, on PostgreSQL through Drizzle. It leaves out the page's variants (Zod schemas, TypeORM, MySQL, GitHub and custom signature schemes) and its tests.

### What is where

| Path | Contents |
| --- | --- |
| `src/app.module.ts` | `DrizzleModule`, `OutboxModule` and `WebhooksModule` with its receivers, and both stores, `PostgresOutboxStore` and `PostgresWebhookStore`, on the Drizzle database |
| `src/database/` | The Drizzle schema: the order API's own tables |
| `src/partners/` | `PartnerGuard`: a partner's API key, `Authorization: Bearer <key>` |
| `src/orders/` | `OrdersService` dispatches `order.cancelled` and `order.shipped` in the order's transaction |
| `src/partner-webhooks/` | The partners' subscriptions (`WebhookEndpoints`) and delivery log (`WebhookDeliveries`) |
| `src/provider-webhooks/` | The payment provider's and the carrier's webhooks, behind `@VerifyWebhook()` |
| `drizzle/` | The order API's migrations, written by drizzle-kit: its tables, the products and the partners |
| `partner-service/` | Northside's receiver: it only receives (`outgoing: false`) |
| `scripts/send-webhook.ts` | Signs and sends the requests that the payment provider and the carrier would send |

### Installation

`npm install`

### Running

This example requires Docker or a local PostgreSQL installation, with a `store` database for the order API.

#### Docker

The `docker-compose.yml` file starts PostgreSQL and creates the `store` database:

`docker compose up -d`

When you're done with the sample, stop the container:

`docker compose down`

#### Migrations

Apply the order API's migrations. They create its tables, the two products and the two partners:

```bash
$ export DATABASE_URL=postgres://postgres:postgres@localhost:5432/store
$ npm run migrate
```

The migrations don't create any tables for webhooks or for the outbox. Their stores keep their tables in schemas of their own, `nest_webhooks` and `nest_outbox`, in the same database, and create them when the API starts. In production (`NODE_ENV=production`) they don't. Apply their migrations in your deploy step instead, with `npx nest-webhooks migrate` and `npx nest-outbox migrate` (both read `DATABASE_URL`, or `--url`).

### Run the sample

Export the secrets that the payment provider and the carrier share with the store (invented here), allow deliveries to this machine, and start the order API on port 3000:

```bash
$ export PAYMENTS_WEBHOOK_SECRET=whsec_$(openssl rand -base64 32)
$ export CARRIER_WEBHOOK_SECRET=carrier_test_$(openssl rand -hex 6)
$ export WEBHOOKS_ALLOW_LOCAL=1
$ npm run start
```

On startup, the API logs the store each module uses. On the first start, it also logs the schemas the stores created:

```bash
[Nest] 72896  - 10/03/2026, 7:24:34 PM     LOG [OutboxModule] OutboxStorage: PostgresOutboxStore
[Nest] 72896  - 10/03/2026, 7:24:34 PM     LOG [WebhooksModule] WebhooksStorage: PostgresWebhookStore
[Nest] 72896  - 10/03/2026, 7:24:34 PM     LOG [OutboxModule] PostgresOutboxStore: migrated schema "nest_outbox" to version 1.
[Nest] 72896  - 10/03/2026, 7:24:34 PM     LOG [WebhooksModule] PostgresWebhookStore: migrated schema "nest_webhooks" to version 1.
```

Northside's receiver (port 4100) needs the secret the store gives its endpoint, so it starts after the subscription in [Try it](#try-it):

```bash
$ STORE_WEBHOOK_SECRET=<the endpoint's secret> npm run start:partner
```

| Variable | Used by | Meaning |
| --- | --- | --- |
| `DATABASE_URL` | Order API | The `store` database: `postgres://postgres:postgres@localhost:5432/store` with Docker |
| `PAYMENTS_WEBHOOK_SECRET` | Order API, `send-webhook.ts` | The payment provider's secret, a `whsec_…` |
| `CARRIER_WEBHOOK_SECRET` | Order API, `send-webhook.ts` | The carrier's secret |
| `WEBHOOKS_ALLOW_LOCAL` | Order API | `1` accepts `http://` endpoints on this machine. For development only |
| `WEBHOOKS_ENCRYPTION_KEYS` | Order API | Optional: comma-separated keys (`openssl rand -base64 32`), newest first, that seal the endpoints' secrets at rest |
| `OUTBOX_RELAY`, `WEBHOOKS_WORKER` | Order API | `off` starts an instance that dispatches without relaying or delivering |
| `STORE_WEBHOOK_SECRET` | Partner service | The endpoint's secret, or `new,old` while the store rotates it |
| `API_URL` | `send-webhook.ts` | Where to send (`http://localhost:3000`) |
| `WEBHOOK_ID`, `TAMPER` | `send-webhook.ts` | A redelivery with a given id; `1` changes a byte of the body after signing it |
| `PORT` | Both | The port to listen on (`3000` for the order API, `4100` for the partner service) |

### Try it

These are the steps of the tutorial's [Try it](https://docs.nestjs.com/http/webhooks#try-it) section, which shows each response. The sample partners' API keys are `partner_northside_7c1d2e` (Northside Pet Supplies) and `partner_riverside_91ab44` (Riverside Cat Shelter). `--json` needs curl 7.82 or later.

Northside subscribes to both events at its receiver. The response has the endpoint's secret, which is shown only this once:

```bash
$ curl -s -X POST localhost:3000/partner/webhook-endpoints \
    -H 'Authorization: Bearer partner_northside_7c1d2e' \
    --json '{"url":"http://127.0.0.1:4100/store/webhooks","eventTypes":["order.shipped","order.cancelled"],"description":"Warehouse system"}'
```

The API refuses a cloud metadata URL and an event type it doesn't send. Riverside gets a 404 for Northside's endpoint:

```bash
$ curl -s -X POST localhost:3000/partner/webhook-endpoints \
    -H 'Authorization: Bearer partner_northside_7c1d2e' \
    --json '{"url":"https://169.254.169.254/latest/meta-data/","eventTypes":["*"]}'
$ curl -s -X POST localhost:3000/partner/webhook-endpoints \
    -H 'Authorization: Bearer partner_northside_7c1d2e' \
    --json '{"url":"https://hooks.northside.example.com/store","eventTypes":["order.paid"]}'
$ curl -s -o /dev/null -w '%{http_code}' localhost:3000/partner/webhook-endpoints/<endpoint id> \
    -H 'Authorization: Bearer partner_riverside_91ab44'
```

In a second terminal, start Northside's receiver with that secret:

```bash
$ STORE_WEBHOOK_SECRET=<the endpoint's secret> npm run start:partner
```

Place an order. Then let the payment provider pay for it and the carrier ship it, with requests that the script signs using the secrets you exported. Run the script in a terminal that has those exports. Northside's receiver logs `order.shipped` right after the carrier's webhook:

```bash
$ curl -s -X POST localhost:3000/orders \
    -H 'Authorization: Bearer partner_northside_7c1d2e' \
    --json '{"items":[{"productId":"salmon-kibble-2kg","quantity":2}]}'
$ npx tsx scripts/send-webhook.ts payments payment.succeeded \
    '{"paymentId":"pay_8f21c","orderId":"<order id>","amount":4998}'
$ npx tsx scripts/send-webhook.ts carrier shipment.shipped \
    '{"orderId":"<order id>","trackingNumber":"TRK-4471-0001"}'
$ curl -s localhost:3000/orders/<order id> -H 'Authorization: Bearer partner_northside_7c1d2e'
$ curl -s localhost:3000/partner/webhook-deliveries -H 'Authorization: Bearer partner_northside_7c1d2e'
$ curl -s localhost:3000/partner/webhook-deliveries/<delivery id> -H 'Authorization: Bearer partner_northside_7c1d2e'
```

Stop Northside's receiver with `Ctrl+C`, then place an order and cancel it. The delivery stays pending, and the API logs when it will retry:

```bash
$ curl -s -X POST localhost:3000/orders \
    -H 'Authorization: Bearer partner_northside_7c1d2e' \
    --json '{"items":[{"productId":"clumping-litter-10l","quantity":1}]}'
$ curl -s -X POST localhost:3000/orders/<order id>/cancel \
    -H 'Authorization: Bearer partner_northside_7c1d2e' \
    --json '{"reason":"out of stock"}'
$ curl -s 'localhost:3000/partner/webhook-deliveries?status=pending' -H 'Authorization: Bearer partner_northside_7c1d2e'
```

Start the receiver again. The retry goes through, and the delivery's log keeps every attempt. Then ask for the delivery again: it goes out with the same `webhook-id`, and the receiver's inbox answers 204 without running its handler:

```bash
$ curl -s -X POST localhost:3000/partner/webhook-deliveries/<delivery id>/retry \
    -H 'Authorization: Bearer partner_northside_7c1d2e'
$ curl -s localhost:3000/partner/webhook-deliveries/<delivery id> -H 'Authorization: Bearer partner_northside_7c1d2e'
```

On the payment provider's side, a redelivery with the same `webhook-id` gets a 200 but isn't processed again, so the API logs one payment. A tampered body and a wrong secret get a 401:

```bash
$ curl -s -X POST localhost:3000/orders \
    -H 'Authorization: Bearer partner_northside_7c1d2e' \
    --json '{"items":[{"productId":"salmon-kibble-2kg","quantity":1}]}'
$ WEBHOOK_ID=msg_2c9e4f1a npx tsx scripts/send-webhook.ts payments payment.succeeded \
    '{"paymentId":"pay_9d0a2","orderId":"<order id>","amount":2499}'
$ WEBHOOK_ID=msg_2c9e4f1a npx tsx scripts/send-webhook.ts payments payment.succeeded \
    '{"paymentId":"pay_9d0a2","orderId":"<order id>","amount":2499}'
$ TAMPER=1 npx tsx scripts/send-webhook.ts payments payment.succeeded \
    '{"paymentId":"pay_9d0a2","orderId":"<order id>","amount":2499}'
$ PAYMENTS_WEBHOOK_SECRET=whsec_$(openssl rand -base64 32) npx tsx scripts/send-webhook.ts payments payment.succeeded \
    '{"paymentId":"pay_9d0a2","orderId":"<order id>","amount":2499}'
```

Rotate the endpoint's secret, then cancel that order. The delivery carries a signature for each secret, so the receiver verifies it with the old one. Then restart the receiver with the new secret first and the old one after it (`STORE_WEBHOOK_SECRET=<new secret>,<old secret>`), and place and cancel another order. That delivery verifies too:

```bash
$ curl -s -X POST localhost:3000/partner/webhook-endpoints/<endpoint id>/rotate-secret \
    -H 'Authorization: Bearer partner_northside_7c1d2e'
$ curl -s -X POST localhost:3000/orders/<order id>/cancel \
    -H 'Authorization: Bearer partner_northside_7c1d2e' \
    --json '{"reason":"customer changed their mind"}'
```

The deliveries are rows in the `store` database, in the store's schema:

```bash
$ docker compose exec postgres psql -U postgres -d store \
    -c "SELECT type, status, attempts, last_status_code FROM nest_webhooks.deliveries ORDER BY created_at"
```
