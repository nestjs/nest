<p align="center">
  <a href="https://nestjs.com/" target="_blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">一个渐进式 <a href="https://nodejs.cn" target="_blank">Node.js</a> 框架，用于构建高效且可扩展的服务器端应用程序，从单个文件中的小型 API 到企业级系统。</p>
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

### [English](Readme.md)

## 介绍

Nest 是一个用于在 [Node.js](https://nodejs.cn) 上构建后端的 TypeScript 框架，适用于从单个文件中的小型 API 到由多个团队共同开发的企业级系统。它为应用程序提供模块和依赖注入，并让验证、身份认证和错误处理各自集中在一处，使项目在不断增长的同时保持清晰的结构。

它可以运行在 [Express](https://github.com/expressjs/express)、[Fastify](https://github.com/fastify/fastify) 或 Node 自带的 `node:http` 之上，其官方包覆盖了后端所需的大部分功能，因此你可以从小处着手，按需逐步添加。

在 `node:http` 上，通过 [`NodeAdapter`](https://docs.nestjs.com/http/performance#node-adapter)，Nest 每秒处理的请求数比原生 Fastify 少约 3%，比 Express 多约 50%（[基准测试](https://docs.nestjs.com/faq/nest-vs-fastify-express-hono#performance)）。

## 快速开始

```bash
npx @nestjs/cli new my-api
cd my-api
npm run start:dev
```

编码智能体（coding agent）或脚本可以使用 `npx @nestjs/cli new . --skip-git --package-manager npm` 在当前文件夹中创建项目。当 stdin 不是终端时，该命令不会提出任何问题，并会添加一个供智能体阅读的 `AGENTS.md`。

添加 `--minimal` 可以从单个文件开始。一个应用程序可以小到这样：

```typescript
import { Controller, Get } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

@Controller()
class AppController {
  @Get()
  hello() {
    return 'Hello, Nest!';
  }
}

const app = await NestFactory.create({ controllers: [AppController] });
await app.listen(3000);
```

传给 `NestFactory.create()` 的对象就是根模块的元数据，因此也可以在其中使用 `imports` 和 `providers`。当根模块需要中间件，或者希望 `nest generate` 自动注册它生成的内容时，再将其移入一个 `@Module()` 类。

与其他 Nest 项目一样，使用 `npm run start:dev` 运行它。Nest CLI 在编译时会生成装饰器元数据，基于类型的构造函数注入和 `ValidationPipe` 都依赖这些元数据。不生成这些元数据的工具（例如 `tsx`）会使注入的依赖变为 `undefined`。

## 官方包

| 你需要的功能 | 包 |
| --- | --- |
| 语言模型、以提供者方法实现的工具、智能体、向浏览器流式传输 | [`@nestjs/ai`](https://docs.nestjs.com/ai/overview) |
| MCP 服务器 | [`@nestjs/mcp`](https://docs.nestjs.com/mcp/overview) |
| 登录、会话、令牌、双因素认证、API 密钥 | [`@nestjs/authentication`](https://docs.nestjs.com/security/authentication) |
| 权限 | [`@nestjs/authorization`](https://docs.nestjs.com/security/authorization) |
| 电子邮件 | [`@nestjs/mail`](https://docs.nestjs.com/application/mail) |
| 文件（包括 S3） | [`@nestjs/storage`](https://docs.nestjs.com/application/file-storage) |
| 翻译 | [`@nestjs/i18n`](https://docs.nestjs.com/application/i18n) |
| 数据库 | [`@nestjs/typeorm`](https://docs.nestjs.com/data/typeorm), [`@nestjs/drizzle`](https://docs.nestjs.com/data/drizzle), [`@nestjs/mongoose`](https://docs.nestjs.com/data/mongodb), [`@nestjs/sequelize`](https://docs.nestjs.com/data/sequelize) |
| 重试、超时、熔断器 | [`@nestjs/resilience`](https://docs.nestjs.com/reliability/resilience) |
| 幂等键 | [`@nestjs/idempotency`](https://docs.nestjs.com/reliability/idempotency) |
| 事务性发件箱（transactional outbox） | [`@nestjs/outbox`](https://docs.nestjs.com/reliability/outbox) |
| Webhook 的发送与接收 | [`@nestjs/webhooks`](https://docs.nestjs.com/http/webhooks) |
| 只在一个实例上运行任务、锁 | [`@nestjs/locks`](https://docs.nestjs.com/reliability/locks) |
| 持续数天的流程 | [`@nestjs/workflows`](https://docs.nestjs.com/reliability/workflows) |
| 队列与定时任务 | [`@nestjs/bullmq`](https://docs.nestjs.com/application/queues), [`@nestjs/schedule`](https://docs.nestjs.com/application/task-scheduling) |
| GraphQL、WebSocket、微服务 | [GraphQL](https://docs.nestjs.com/graphql/quick-start), [网关](https://docs.nestjs.com/websockets/gateways), [微服务](https://docs.nestjs.com/microservices/basics) |
| OpenAPI | [`@nestjs/swagger`](https://docs.nestjs.com/openapi/introduction) |
| 配置、缓存、限流、健康检查 | [`@nestjs/config`](https://docs.nestjs.com/application/configuration), [`@nestjs/cache-manager`](https://docs.nestjs.com/data/caching), [`@nestjs/throttler`](https://docs.nestjs.com/security/rate-limiting), [`@nestjs/terminus`](https://docs.nestjs.com/reliability/terminus) |

## 迁移到 Nest

- [从 Express 迁移](https://docs.nestjs.com/recipes/express-migration)，可以一次迁移一个路由，也可以一次全部迁移。
- [从 Fastify 迁移](https://docs.nestjs.com/recipes/fastify-migration)，保留你的插件。
- [作为 Next.js 应用的后端](https://docs.nestjs.com/recipes/nextjs)，逐个迁移路由处理程序（route handler）。

## 使用编码智能体

完整文档均提供 markdown 版本，索引位于 [docs.nestjs.com/llms.txt](https://docs.nestjs.com/llms.txt)。由 `nest new` 创建的项目自带一个 `AGENTS.md`，其中列出了上面的这些包，因为大多数模型的训练时间早于这些包的出现。

官方的 [NestJS 智能体技能（agent skills）](https://github.com/nestjs/agent-skills) 会向智能体讲解当前的 API，以及那些测试发现不了的常见错误。它们涵盖创建项目、功能开发、身份认证与授权、数据、测试和生产环境。使用以下命令将它们添加到项目中：

```bash
npx @nestjs/skills add
```

该命令会把它们复制到 `.agents/skills`，Codex 和 Cursor 会读取该目录。添加 `--agent claude` 可用于 Claude Code，添加 `--agent all` 则同时用于两者。Claude Code 也可以将它们作为插件安装：先运行 `claude plugin marketplace add nestjs/agent-skills`，再运行 `claude plugin install nestjs@nestjs`。

## 设计哲学

<p>近几年，由于 Node.js，JavaScript 已经成为 Web 前端和后端应用程序的「通用语言」，从而产生了像<a href="https://angular.cn" target="_blank">Angular</a>、<a href="https://react.dev/">React</a>、<a href="https://vuejs.org/" target="_blank">Vue</a>等令人耳目一新的项目，这些项目提高了开发人员的生产力，使得可以快速构建可测试的且可扩展的前端应用程序。 然而，在服务器端，虽然有很多优秀的库、helper 和 Node 工具，但是它们都没有有效地解决主要问题 - 架构。</p>

<p>Nest 旨在提供一个开箱即用的应用程序体系结构，允许轻松创建高度可测试，可扩展，松散耦合且易于维护的应用程序。该架构深受 Angular 的启发。</p>

## 开始

* 要查看 [English指南](https://docs.nestjs.com), 请访问 [docs.nestjs.com](https://docs.nestjs.com). :books:
* 要查看中文 [指南](https://docs.nestjs.cn), 请访问 [docs.nestjs.cn](https://docs.nestjs.cn). :books:

### 国内开发者交流群

QQ群：277386223
QQ群：336289049
QQ群：489719517

> 注意：这个交流群不是 NestJS 官方支持和维护的，只是为了方便国内开发者交流而建立的。
> （Note: This channel is not officially supported and maintained by the NestJS org members.）

## 问题

如有疑问或需要支持，请使用官方 [Discord 频道](https://discord.gg/G7Qnnhy)。本仓库的 issue 列表**仅**用于错误报告和功能请求。

## Issue

提交 issue 之前，请务必阅读 [Issue 报告清单](https://github.com/nestjs/nest/blob/master/CONTRIBUTING.md#-submitting-an-issue)。不符合指南的 issue 可能会被直接关闭。

## 可观测性

[NestJS Observe](https://observe.nestjs.com) 是 Nest 应用程序的官方可观测性平台。安装 `@nestjs/observe` SDK 并传入 API 密钥后，请求、后台任务、错误、日志和分布式追踪就会开始实时发送到仪表盘，无需手动编写 span，也无需运行采集器（collector）。由于 SDK 接入了 Nest 自身的请求生命周期，一条追踪读起来就像你的控制器和提供者的调用图，而不只是一个 HTTP 路由。每月 300,000 个事件以内免费，另有无需注册的[在线演示](https://www.observe-demo.nestjs.com/dashboard)。

## 咨询

通过官方支持，你可以直接获得 Nest 核心团队的专家帮助。我们提供专属技术支持、迁移策略、最佳实践（及设计决策）建议、PR 审查以及团队扩充。[在此](https://enterprise.nestjs.com)了解更多关于支持的信息。

## 赞助商

Nest 是一个采用 MIT 许可的开源项目。它的发展得益于赞助商和支持者的支持。如果你想加入他们，请[查看更多](https://docs.nestjs.com/support)。谢谢！ :heart_eyes:

## 支持者

<a href="https://opencollective.com/nest"><img src="https://opencollective.com/nest/backers.svg?width=890"></a>

## 相关人员

* 作者 - [Kamil Myśliwiec](https://x.com/kammysliwiec)
* 网站 - [https://nestjs.com](https://nestjs.com/)
* X - [@nestframework](https://x.com/nestframework)

## License

Nest 采用 [MIT 许可证](https://github.com/nestjs/nest/blob/master/LICENSE)。
