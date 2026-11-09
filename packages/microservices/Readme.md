<p align="center">
  <a href="https://nestjs.com/" target="_blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="https://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications, from a small API in one file to enterprise-grade systems.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://github.com/nestjs/nest/blob/master/LICENSE" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

Nest is a TypeScript framework for building backends on [Node.js](https://nodejs.org), from a small API in one file to an enterprise-grade system with many teams. It gives an application modules, dependency injection, and one place each for validation, authentication and error handling, so a project keeps its shape as it grows.

It runs on [Express](https://github.com/expressjs/express), [Fastify](https://github.com/fastify/fastify) or Node's own `node:http`, and its first-party packages cover most of what a backend needs, so you can start small and add them as you go.

## Quick start

```bash
npx @nestjs/cli new my-api
cd my-api
npm run start:dev
```

Add `--minimal` to start from a single file. An application can be this small, and `npx tsx src/main.ts` runs it with no build step:

```typescript
import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

@Controller()
class AppController {
  @Get()
  hello() {
    return 'Hello, Nest!';
  }
}

@Module({ controllers: [AppController] })
class AppModule {}

const app = await NestFactory.create(AppModule);
await app.listen(3000);
```

## First-party packages

| What you need | Package |
| --- | --- |
| Language models, tools as provider methods, agents, streaming to the browser | [`@nestjs/ai`](https://docs.nestjs.com/ai/overview) |
| MCP servers | [`@nestjs/mcp`](https://docs.nestjs.com/mcp/overview) |
| Sign-in, sessions, tokens, two-factor, API keys | [`@nestjs/authentication`](https://docs.nestjs.com/security/authentication) |
| Permissions | [`@nestjs/authorization`](https://docs.nestjs.com/security/authorization) |
| Email | [`@nestjs/mail`](https://docs.nestjs.com/application/mail) |
| Files, S3 included | [`@nestjs/storage`](https://docs.nestjs.com/application/file-storage) |
| Translations | [`@nestjs/i18n`](https://docs.nestjs.com/application/i18n) |
| Databases | [`@nestjs/typeorm`](https://docs.nestjs.com/data/typeorm), [`@nestjs/drizzle`](https://docs.nestjs.com/data/drizzle), [`@nestjs/mongoose`](https://docs.nestjs.com/data/mongodb), [`@nestjs/sequelize`](https://docs.nestjs.com/data/sequelize) |
| Retries, timeouts, circuit breakers | [`@nestjs/resilience`](https://docs.nestjs.com/reliability/resilience) |
| Idempotency keys | [`@nestjs/idempotency`](https://docs.nestjs.com/reliability/idempotency) |
| Transactional outbox | [`@nestjs/outbox`](https://docs.nestjs.com/reliability/outbox) |
| Webhooks, sending and receiving | [`@nestjs/webhooks`](https://docs.nestjs.com/http/webhooks) |
| Running a job on one instance, locks | [`@nestjs/locks`](https://docs.nestjs.com/reliability/locks) |
| Processes that take days | [`@nestjs/workflows`](https://docs.nestjs.com/reliability/workflows) |
| Queues and scheduled jobs | [`@nestjs/bullmq`](https://docs.nestjs.com/application/queues), [`@nestjs/schedule`](https://docs.nestjs.com/application/task-scheduling) |
| GraphQL, WebSockets, microservices | [GraphQL](https://docs.nestjs.com/graphql/quick-start), [gateways](https://docs.nestjs.com/websockets/gateways), [microservices](https://docs.nestjs.com/microservices/basics) |
| OpenAPI | [`@nestjs/swagger`](https://docs.nestjs.com/openapi/introduction) |
| Configuration, caching, rate limiting, health checks | [`@nestjs/config`](https://docs.nestjs.com/application/configuration), [`@nestjs/cache-manager`](https://docs.nestjs.com/data/caching), [`@nestjs/throttler`](https://docs.nestjs.com/security/rate-limiting), [`@nestjs/terminus`](https://docs.nestjs.com/reliability/terminus) |

## Moving to Nest

- [From Express](https://docs.nestjs.com/recipes/express-migration), one route at a time or all at once.
- [From Fastify](https://docs.nestjs.com/recipes/fastify-migration), keeping your plugins.
- [As the backend of a Next.js app](https://docs.nestjs.com/recipes/nextjs), moving route handlers across one by one.

## Using a coding agent

The whole documentation is available as markdown, with an index at [docs.nestjs.com/llms.txt](https://docs.nestjs.com/llms.txt). Projects from `nest new` come with an `AGENTS.md` that lists the packages above, since most models were trained before they existed.

## Philosophy

<p>In recent years, thanks to Node.js, JavaScript has become the “lingua franca” of the web for both front-end and back-end applications, giving rise to awesome projects like <a href="https://angular.dev/" target="_blank">Angular</a>, <a href="https://react.dev/" target="_blank">React</a>, and <a href="https://vuejs.org/" target="_blank">Vue</a>, which improve developer productivity and enable the construction of fast, testable, and extensible frontend applications. However, on the server-side, while there are a lot of superb libraries, helpers, and tools for Node, none of them effectively solve the main problem - the architecture.</p>
<p>Nest aims to provide an application architecture out of the box which allows for effortless creation of highly testable, scalable, and loosely coupled and easily maintainable applications. The architecture is heavily inspired by Angular.</p>

## Getting started

- To check out the [guide](https://docs.nestjs.com), visit [docs.nestjs.com](https://docs.nestjs.com). :books:
- 要查看中文 [指南](readme_zh.md), 请访问 [docs.nestjs.cn](https://docs.nestjs.cn). :books:
- [가이드](readme_kr.md) 문서는 [docs.nestjs.com](https://docs.nestjs.com)에서 확인하실 수 있습니다. :books:
- [ガイド](readme_jp.md)は [docs.nestjs.com](https://docs.nestjs.com)でご確認ください。 :books:

## Questions

For questions and support please use the official [Discord channel](https://discord.gg/G7Qnnhy). The issue list of this repo is **exclusively** for bug reports and feature requests.

## Issues

Please make sure to read the [Issue Reporting Checklist](https://github.com/nestjs/nest/blob/master/CONTRIBUTING.md#-submitting-an-issue) before opening an issue. Issues not conforming to the guidelines may be closed immediately.

## Observability

[NestJS Observe](https://observe.nestjs.com) is the official observability platform for Nest applications. Install the `@nestjs/observe` SDK, pass an API key, and requests, background jobs, errors, logs, and distributed traces start streaming to a dashboard - no manual span wiring and no collector to run. Because the SDK hooks into Nest's own request lifecycle, a trace reads like a call graph of your controllers and providers instead of a bare HTTP route. Free for up to 300,000 events a month, and there is a [live demo](https://www.observe-demo.nestjs.com/dashboard) with no signup.

## Consulting

With official support, you can get expert help straight from the Nest core team. We provide dedicated technical support, migration strategies, advice on best practices (and design decisions), PR reviews, and team augmentation. Read more about [support here](https://enterprise.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support from the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

#### Principal Sponsors

<table style="text-align:center;">
<tr>
<td><a href="https://trilon.io" target="_blank"><img src="https://nestjs.com/img/github/trilon-logo.svg" width="200" valign="middle" /></a></td>
<td><a href="https://microsoft.com/" target="_blank"><img src="https://nestjs.com/img/github/microsoft-logo.png" width="180" valign="middle" /></a></td>
<td><a href="https://mojam.co" target="_blank"><img src="https://images.opencollective.com/mojamco/981e9de/logo/256.png?height=256" width="80" valign="middle" /></a></td>
<td><a href="https://valor-software.com/" target="_blank"><img src="https://docs.nestjs.com/assets/sponsors/valor-software.png" width="170" valign="middle" /></a></td>
<td><a href="https://serpapi.com/" target="_blank"><img src="https://nestjs.com/img/github/serpapi-logo.png" width="150" valign="middle" /></a></td>
</tr>
</table>

#### Gold Sponsors

<table style="text-align:center;">
<tr>
<td><a href="https://www.redhat.com" target="_blank"><img src="https://nestjs.com/img/github/red-hat-logo.svg" width="150" valign="middle" /></a></td>
<td><a href="https://github.com/Sanofi-IADC" target="_blank"><img src="https://docs.nestjs.com/assets/sponsors/sanofi.png" width="120" valign="middle" /></a></td>
<td><a href="https://nx.dev" target="_blank"><img src="https://nestjs.com/img/github/nx-logo.png" height="45" valign="middle" /></a></td>
<td><a href="https://intrinsic.ventures/" target="_blank"><img src="https://nestjs.com/img/github/intrinisic-logo.png" width="150" valign="middle" /></a></td>
<td><a href="https://jetbrains.com/" target="_blank"><img src="https://nestjs.com/img/github/jetbrains-logo.svg" width="70" valign="middle" /></a></td>
</tr>
<tr>
<td><a href="https://snyk.co/nestjs" target="_blank"><img src="https://nestjs.com/img/github/snyk-logo-black.png" width="125" valign="middle" /></a></td>
<td align="center"><a href="https://www.movavi.com/imovie-for-windows.html" target="_blank"><img src="https://images.opencollective.com/movavi/1fb15e5/avatar/256.png?height=256" width="60" valign="middle" /></a></td>
</tr>
</table>

#### Silver Sponsors

<table style="text-align:center;">
<tr>
<td><a href="https://www.mercedes-benz.com/" target="_blank"><img src="https://nestjs.com/img/github/mercedes-logo.png" width="100" valign="middle" /></a></td>
<td><a href="https://handsontable.com/docs/react-data-grid/?utm_source=NestJS_GH&utm_medium=sponsorship&utm_campaign=library_sponsorship_2024" target="_blank"><img src="https://nestjs.com/img/github/handsontable-dark-logo.svg#2" width="150" valign="middle" /></a></td>
<td align="center" valign="middle"><a href="https://www.itflashcards.com/" target="_blank"><img src="https://nestjs.com/img/github/it_flashcards-logo.png" width="170" valign="middle" /></a></td>
<td align="center" valign="middle"><a href="https://arcjet.com/?ref=nestjs" target="_blank"><img src="https://nestjs.com/img/github/arcjet-logo.svg" width="170" valign="middle" /></a></td>
<td align="center" valign="middle"><a href="https://pandektes.com" target="_blank"><img src="https://nestjs.com/img/github/pandektes-logo.png" width="65" valign="middle" /></a></td>
</tr><tr>
<td align="center" valign="middle"><a href="https://www.fintechcrafts.com/" target="_blank"><img src="https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/935813df-48a9-4b41-b923-7d70b5621c6b/2026-05-06%2010%2021%2033.png" width="65" valign="middle" /></a></td>
<td align="center" valign="middle"><a href="https://talordata.com/?campaignid=Ya5Xpw2gmhyee6Tg&utm_source=nestjs&utm_term=nestjs" target="_blank"><img src="https://images.opencollective.com/elowen/9ccac7f/avatar/512.png" width="65" valign="middle" /></a></td>
<td align="center" valign="middle"><a href="https://memory2.co/" target="_blank"><img src="https://images.opencollective.com/memory-squared/bbe37f5/avatar/256.png?height=50" width="65" valign="middle" /></a></td>
</tr>
</table>

#### Sponsors

<table>
<tr>
<td align="center" valign="middle"><a href="https://mantro.net/" target="_blank"><img src="https://nestjs.com/img/github/mantro-logo.svg" width="95" valign="middle" /></a></td>
<td align="center" valign="middle"><a href="https://triplebyte.com/" target="_blank"><img src="https://nestjs.com/img/github/triplebyte-logo.png" width="107" valign="middle" /></a></td>
<td align="center" valign="middle"><a href="https://nearpod.com/" target="_blank"><img src="https://nestjs.com/img/github/nearpod-logo.svg" width="100" valign="middle" /></a></td>
<td align="center" valign="middle"><a href="https://www.naologic.com/" target="_blank"><img src="https://nestjs.com/img/github/naologic-logo.svg" width="125" valign="middle" /></a></td>
<td align="center" valign="middle"><a href="https://triplecore.io" target="_blank"><img src="https://nestjs.com/img/github/triplecore-logo.svg" width="50" valign="middle" /></a>
<td align="center" valign="middle"><a href="https://www.hingehealth.com/" target="_blank"><img src="https://nestjs.com/img/github/hinge-health-logo.svg" width="100" valign="middle" /></a></td>
</tr>
</table>

## Backers

<a href="https://opencollective.com/nest" target="_blank"><img src="https://opencollective.com/nest/backers.svg?width=1000"></a>

## Stay in touch

- Author - [Kamil Myśliwiec](https://x.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- X - [@nestframework](https://x.com/nestframework)

## License

Nest is [MIT licensed](LICENSE).
