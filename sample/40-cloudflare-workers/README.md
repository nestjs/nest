# Nest on Cloudflare Workers

A Nest application served by [Cloudflare Workers](https://developers.cloudflare.com/workers/) through `@nestjs/platform-cloudflare`, with cats stored in a [KV namespace](https://developers.cloudflare.com/kv/).

The Workers runtime implements `node:http` (with the `nodejs_compat` flag and a compatibility date of 2025-09-01 or later), so the application runs on Express, as it does on Node.js. `src/worker.ts` replaces `main.ts`: `createWorkerHandler()` bootstraps the application on the first request of each isolate and hands every request to it. Providers read the bindings through `CloudflareContext`.

## Running the app

```bash
$ npm install

# local development, in workerd
$ npm run start

# end-to-end tests, in workerd
$ npm run test:e2e
```

## Deploying

```bash
$ npx wrangler kv namespace create CATS
# copy the id it prints to "kv_namespaces" in wrangler.jsonc
$ npm run deploy
```

## Limitations

The runtime does not provide everything Node.js does, so the following are not available:

- WebSocket gateways (`node:http` servers on Workers do not emit `upgrade`)
- `app.enableShutdownHooks()` (isolates are not sent signals)
- microservice transports that listen on a TCP port
- `app.useStaticAssets()` (use [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/) instead)
- `httpsOptions` (TLS is terminated by Cloudflare)

State held in memory, like a provider's fields, lasts as long as the isolate, which Cloudflare may evict or duplicate at any time: keep it in a binding (KV, D1, Durable Objects...).
