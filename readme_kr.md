<p align="center">
  <a href="https://nestjs.com/" target="_blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">효율적이고 확장 가능한 서버 사이드 애플리케이션을 위한 진보적인 <a href="https://nodejs.org" target="_blank">Node.js</a> 프레임워크로, 파일 하나짜리 작은 API부터 엔터프라이즈급 시스템까지 아우릅니다.</p>
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

## 개요

Nest는 [Node.js](https://nodejs.org) 위에서 백엔드를 구축하기 위한 TypeScript 프레임워크로, 파일 하나짜리 작은 API부터 여러 팀이 함께 개발하는 엔터프라이즈급 시스템까지 아우릅니다. 애플리케이션에 모듈과 의존성 주입을 제공하고, 유효성 검사, 인증, 에러 처리를 각각 한곳에서 다루게 해 주므로 프로젝트가 커져도 구조가 유지됩니다.

Nest는 [Express](https://github.com/expressjs/express), [Fastify](https://github.com/fastify/fastify) 또는 Node 자체의 `node:http` 위에서 실행됩니다. 공식 패키지들이 백엔드에 필요한 대부분의 기능을 제공하므로 작게 시작해서 필요할 때마다 추가할 수 있습니다.

`node:http`에서 [`NodeAdapter`](https://docs.nestjs.com/http/performance#node-adapter)를 사용하면 Nest의 초당 요청 처리량은 순수 Fastify보다 약 3% 적고 Express보다 약 50% 많습니다([벤치마크](https://docs.nestjs.com/faq/nest-vs-fastify-express-hono#performance)).

## 빠른 시작

```bash
npx @nestjs/cli new my-api
cd my-api
npm run start:dev
```

코딩 에이전트나 스크립트는 `npx @nestjs/cli new . --skip-git --package-manager npm`으로 현재 폴더에 프로젝트를 만들 수 있습니다. 이 명령은 stdin이 터미널이 아니면 아무것도 묻지 않으며, 에이전트가 읽을 `AGENTS.md`를 추가합니다.

`--minimal`을 추가하면 파일 하나로 시작할 수 있습니다. 애플리케이션은 이만큼 작을 수 있습니다:

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

`NestFactory.create()`에 전달하는 객체는 루트 모듈의 메타데이터이므로 `imports`와 `providers`도 여기에 쓸 수 있습니다. 루트 모듈에 미들웨어가 필요하거나 `nest generate`가 생성한 항목을 등록하게 하려면 이 객체를 `@Module()` 클래스로 옮기세요.

다른 Nest 프로젝트와 마찬가지로 `npm run start:dev`로 실행합니다. Nest CLI는 타입 기반 생성자 주입과 `ValidationPipe`가 의존하는 데코레이터 메타데이터를 포함해 컴파일합니다. `tsx`처럼 이 메타데이터를 생성하지 않는 도구로 실행하면 주입된 의존성이 `undefined`가 됩니다.

## 공식 패키지

| 필요한 기능 | 패키지 |
| --- | --- |
| 언어 모델, 프로바이더 메서드로 만드는 도구, 에이전트, 브라우저로 스트리밍 | [`@nestjs/ai`](https://docs.nestjs.com/ai/overview) |
| MCP 서버 | [`@nestjs/mcp`](https://docs.nestjs.com/mcp/overview) |
| 로그인, 세션, 토큰, 2단계 인증, API 키 | [`@nestjs/authentication`](https://docs.nestjs.com/security/authentication) |
| 권한 | [`@nestjs/authorization`](https://docs.nestjs.com/security/authorization) |
| 이메일 | [`@nestjs/mail`](https://docs.nestjs.com/application/mail) |
| 파일 (S3 포함) | [`@nestjs/storage`](https://docs.nestjs.com/application/file-storage) |
| 번역 | [`@nestjs/i18n`](https://docs.nestjs.com/application/i18n) |
| 데이터베이스 | [`@nestjs/typeorm`](https://docs.nestjs.com/data/typeorm), [`@nestjs/drizzle`](https://docs.nestjs.com/data/drizzle), [`@nestjs/mongoose`](https://docs.nestjs.com/data/mongodb), [`@nestjs/sequelize`](https://docs.nestjs.com/data/sequelize) |
| 재시도, 타임아웃, 서킷 브레이커 | [`@nestjs/resilience`](https://docs.nestjs.com/reliability/resilience) |
| 멱등성 키 | [`@nestjs/idempotency`](https://docs.nestjs.com/reliability/idempotency) |
| 트랜잭셔널 아웃박스 | [`@nestjs/outbox`](https://docs.nestjs.com/reliability/outbox) |
| 웹훅 송신과 수신 | [`@nestjs/webhooks`](https://docs.nestjs.com/http/webhooks) |
| 한 인스턴스에서만 작업 실행, 락 | [`@nestjs/locks`](https://docs.nestjs.com/reliability/locks) |
| 며칠씩 걸리는 프로세스 | [`@nestjs/workflows`](https://docs.nestjs.com/reliability/workflows) |
| 큐와 예약 작업 | [`@nestjs/bullmq`](https://docs.nestjs.com/application/queues), [`@nestjs/schedule`](https://docs.nestjs.com/application/task-scheduling) |
| GraphQL, WebSocket, 마이크로서비스 | [GraphQL](https://docs.nestjs.com/graphql/quick-start), [게이트웨이](https://docs.nestjs.com/websockets/gateways), [마이크로서비스](https://docs.nestjs.com/microservices/basics) |
| OpenAPI | [`@nestjs/swagger`](https://docs.nestjs.com/openapi/introduction) |
| 설정, 캐싱, 속도 제한, 헬스 체크 | [`@nestjs/config`](https://docs.nestjs.com/application/configuration), [`@nestjs/cache-manager`](https://docs.nestjs.com/data/caching), [`@nestjs/throttler`](https://docs.nestjs.com/security/rate-limiting), [`@nestjs/terminus`](https://docs.nestjs.com/reliability/terminus) |

## Nest로 옮겨 오기

- [Express에서](https://docs.nestjs.com/recipes/express-migration): 라우트를 하나씩, 또는 한 번에 모두 옮길 수 있습니다.
- [Fastify에서](https://docs.nestjs.com/recipes/fastify-migration): 플러그인은 그대로 유지합니다.
- [Next.js 앱의 백엔드로](https://docs.nestjs.com/recipes/nextjs): 라우트 핸들러를 하나씩 옮깁니다.

## 코딩 에이전트 사용하기

전체 문서는 markdown으로도 제공되며, 색인은 [docs.nestjs.com/llms.txt](https://docs.nestjs.com/llms.txt)에 있습니다. `nest new`로 만든 프로젝트에는 위 패키지들을 나열한 `AGENTS.md`가 들어 있습니다. 대부분의 모델은 이 패키지들이 나오기 전에 학습되었기 때문입니다.

공식 [NestJS 에이전트 스킬](https://github.com/nestjs/agent-skills)은 에이전트에게 최신 API와, 테스트로는 잡히지 않는 실수들을 알려 줍니다. 프로젝트 시작, 기능 구현, 인증과 인가, 데이터, 테스트, 프로덕션을 다룹니다. 다음 명령으로 프로젝트에 추가하세요:

```bash
npx @nestjs/skills add
```

이 명령은 스킬을 `.agents/skills`에 복사하며, Codex와 Cursor가 이 디렉터리를 읽습니다. Claude Code에서 쓰려면 `--agent claude`를, 둘 다에서 쓰려면 `--agent all`을 추가하세요. Claude Code에서는 플러그인으로도 설치할 수 있습니다: `claude plugin marketplace add nestjs/agent-skills`를 실행한 다음 `claude plugin install nestjs@nestjs`를 실행합니다.

## 철학

<p>최근 몇 년간 Javascript는 Node.js의 발전에 따라 웹의 프론트엔드와 백엔드에 있어서 "공용어"가 되었습니다. 그리고 프론트엔드에서는 <a href="https://angular.dev/" target="_blank">Angular</a>와 <a href="https://react.dev/" target="_blank">React</a>, <a href="https://vuejs.org/" target="_blank">Vue</a>와 같이 멋진 프로젝트들이 등장하여 개발자의 생산성을 향상시켰으며, 빠르고 테스트와 확장이 가능한 프론트엔드 애플리케이션을 만들 수 있게 해주었습니다. 하지만 서버 사이드에서는 Node.js를 위한 우수한 라이브러리와 툴이 많은 가운데, 주요 문제를 효과적으로 해결하는 것은 없었습니다. 그 주요 문제란 바로 아키텍처(architecture)입니다.</p>
<p>Nest는 테스트 친화적이면서 확장이 가능하고 결합이 느슨하며, 유지 관리가 용이한 애플리케이션을 손쉽게 만들 수 있는 애플리케이션 아키텍처 제공을 목표로 합니다. 이 아키텍처는 Angular에서 많은 영감을 받았습니다.</p>

## 시작하기

* To check out the [guide](https://docs.nestjs.com), visit [docs.nestjs.com](https://docs.nestjs.com). :books:
* 要查看中文 [指南](readme_zh.md), 请访问 [docs.nestjs.cn](https://docs.nestjs.cn). :books:
* [가이드](readme_kr.md) 문서는 [docs.nestjs.com](https://docs.nestjs.com)에서 확인하실 수 있습니다. :books:
* [ガイド](readme_jp.md)は [docs.nestjs.com](https://docs.nestjs.com)でご確認ください。 :books:

## 질문

질문이 있거나 지원을 받고 싶으실 경우 공식 [디스코드 채널](https://discord.gg/G7Qnnhy)을 이용해주세요.
이 저장소의 이슈 목록은 버그 리포트와 기능 요청 **전용**으로 사용되고 있습니다.

## 이슈

이슈를 올리기 전에 반드시 [이슈 보고 체크리스트](https://github.com/nestjs/nest/blob/master/CONTRIBUTING.md#-submitting-an-issue)를 확인해주세요. 가이드라인에 맞지 않는 이슈는 바로 클로즈될 수 있습니다.

## 관측성

[NestJS Observe](https://observe.nestjs.com)는 Nest 애플리케이션을 위한 공식 관측성(observability) 플랫폼입니다. `@nestjs/observe` SDK를 설치하고 API 키를 전달하면 요청, 백그라운드 작업, 에러, 로그, 분산 트레이스가 대시보드로 전송되기 시작합니다. span을 직접 연결할 필요도, 컬렉터를 운영할 필요도 없습니다. SDK가 Nest 자체의 요청 라이프사이클에 연결되기 때문에 트레이스는 단순한 HTTP 라우트가 아니라 컨트롤러와 프로바이더의 호출 그래프처럼 읽힙니다. 월 300,000 이벤트까지 무료이며, 가입 없이 볼 수 있는 [라이브 데모](https://www.observe-demo.nestjs.com/dashboard)도 있습니다.

## 자문

공식 지원을 통해 Nest core 팀의 전문적인 도움을 받을 수 있습니다. 우리는 전담 기술 지원, 마이그레이션 전략, 모범 사례 및 설계에 대한 조언, PR 리뷰, 팀 보강에 대한 도움을 제공합니다. 더 자세한 내용은 [공식 지원 페이지](https://enterprise.nestjs.com)에서 확인해주세요.

## 서포트

Nest는 MIT License 오픈 소스 프로젝트이며, 감사하게도 후원자들과 굉장한 기여자들의 서포트를 통해서 더욱 성장할 수 있습니다. 참여하고 싶으시다면 [서포트 문서](https://docs.nestjs.com/support)를 확인해주세요.

## 연락처

* 저자 - [Kamil Myśliwiec](https://x.com/kammysliwiec)
* 웹사이트 - [https://nestjs.com](https://nestjs.com/)
* X - [@nestframework](https://x.com/nestframework)

## 라이선스

Nest는 [MIT 라이선스](https://github.com/nestjs/nest/blob/master/LICENSE)를 따릅니다.
