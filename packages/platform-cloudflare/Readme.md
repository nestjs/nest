<p align="center">
  <a href="https://nestjs.com/" target="_blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

# @nestjs/platform-cloudflare

Serves a Nest application from [Cloudflare Workers](https://developers.cloudflare.com/workers/).

Workers implement [`node:http`](https://developers.cloudflare.com/workers/runtime-apis/nodejs/http/) on top of their `fetch` handler, so the application runs on Express there, as it does on Node.js. This package provides:

- `createWorkerHandler()`, the `fetch` handler that bootstraps the application once per isolate and hands it every request;
- `CloudflareContext` (and `getCloudflareContext()`), to read the bindings (`env`), the `ExecutionContext` and the `cf` metadata of the request from providers;
- `CloudflareAdapter`, the Express adapter tuned for the parts of `node:http` that the runtime emulates.

## Installation

```bash
$ npm i @nestjs/platform-cloudflare @nestjs/platform-express
$ npm i -D wrangler
```

## Usage

`src/worker.ts` replaces `main.ts`:

```ts
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { createWorkerHandler } from '@nestjs/platform-cloudflare';
import { AppModule } from './app.module.js';

export default createWorkerHandler<Env>(AppModule, {
  configure: app => {
    app.useGlobalPipes(new ValidationPipe());
  },
});
```

Import `CloudflareModule` in the root module, then inject `CloudflareContext`:

```ts
@Injectable()
export class CatsService {
  constructor(private readonly cloudflare: CloudflareContext<Env>) {}

  findOne(id: string) {
    return this.cloudflare.env.CATS.get(id, 'json');
  }
}
```

Compile with `tsc`, which emits the decorator metadata that dependency injection relies on (esbuild, which wrangler bundles with, does not), and point `main` at its output:

```jsonc
// wrangler.jsonc
{
  "main": "dist/worker.js",
  "compatibility_date": "2026-10-01",
  "compatibility_flags": ["nodejs_compat"],
  // The core imports these optional packages on demand: without them
  // installed, the bundler needs a module to resolve them to
  "alias": {
    "@nestjs/microservices": "@nestjs/platform-cloudflare/shims/unavailable",
    "@nestjs/microservices/microservices-module.js": "@nestjs/platform-cloudflare/shims/unavailable",
    "@nestjs/websockets/socket-module.js": "@nestjs/platform-cloudflare/shims/unavailable"
  }
}
```

```bash
$ tsc && wrangler dev
```

`handler.getApp(env, ctx)` returns the application, e.g. to resolve providers from a `scheduled()` or `queue()` handler.

## Limitations

- WebSocket gateways are not supported: `node:http` servers on Workers do not emit `upgrade`.
- `app.enableShutdownHooks()` has no effect: isolates are not sent signals.
- Microservice transports that listen on a TCP port are not supported.
- `app.useStaticAssets()` is not supported: use [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/).
- `httpsOptions` and `forceCloseConnections` are ignored, with a warning.
- State held in memory lasts as long as the isolate, which Cloudflare may evict or duplicate at any time: keep it in a binding (KV, D1, Durable Objects...).

A sample application lives in [`sample/40-cloudflare-workers`](https://github.com/nestjs/nest/tree/master/sample/40-cloudflare-workers).

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
