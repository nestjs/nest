<p align="center">
  <a href="https://nestjs.com/" target="_blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">効率的でスケーラブルなサーバーサイドアプリケーションを構築するためのプログレッシブな<a href="https://nodejs.org" target="_blank">Node.js</a>フレームワークです。1つのファイルで書ける小さなAPIから、エンタープライズ規模のシステムまで対応します。</p>
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

## 概要

Nestは、[Node.js](https://nodejs.org)上でバックエンドを構築するためのTypeScriptフレームワークです。1つのファイルで書ける小さなAPIから、多くのチームが関わるエンタープライズ規模のシステムまで対応します。アプリケーションにモジュールと依存性注入を提供し、バリデーション、認証、エラー処理をそれぞれ1か所にまとめられるので、プロジェクトが大きくなっても構造が保たれます。

[Express](https://github.com/expressjs/express)、[Fastify](https://github.com/fastify/fastify)、またはNode標準の`node:http`上で動作します。公式パッケージがバックエンドに必要な機能のほとんどをカバーしているので、小さく始めて必要に応じて追加していけます。

`node:http`上で[`NodeAdapter`](https://docs.nestjs.com/http/performance#node-adapter)を使うと、Nestが1秒あたりに処理するリクエスト数は素のFastifyより約3%少なく、Expressより約50%多くなります（[ベンチマーク](https://docs.nestjs.com/faq/nest-vs-fastify-express-hono#performance)）。

## クイックスタート

```bash
npx @nestjs/cli new my-api
cd my-api
npm run start:dev
```

コーディングエージェントやスクリプトからは、`npx @nestjs/cli new . --skip-git --package-manager npm`で現在のフォルダにプロジェクトを作成できます。stdinが端末でない場合は何も質問せず、エージェントが読むための`AGENTS.md`を追加します。

`--minimal`を付けると1つのファイルから始められます。アプリケーションはこれだけ小さくできます：

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

`NestFactory.create()`に渡すオブジェクトはルートモジュールのメタデータなので、`imports`や`providers`もそこに書けます。ルートモジュールにミドルウェアが必要になったときや、`nest generate`で生成したものを登録させたいときは、`@Module()`クラスに移してください。

ほかのNestプロジェクトと同じく、`npm run start:dev`で実行します。Nest CLIは、型によるコンストラクタインジェクションと`ValidationPipe`が依存するデコレーターメタデータを出力してコンパイルします。`tsx`のようにこのメタデータを出力しないツールで実行すると、注入される依存関係が`undefined`になります。

## 公式パッケージ

| 必要なもの | パッケージ |
| --- | --- |
| 言語モデル、プロバイダーのメソッドとして書くツール、エージェント、ブラウザへのストリーミング | [`@nestjs/ai`](https://docs.nestjs.com/ai/overview) |
| MCPサーバー | [`@nestjs/mcp`](https://docs.nestjs.com/mcp/overview) |
| サインイン、セッション、トークン、二要素認証、APIキー | [`@nestjs/authentication`](https://docs.nestjs.com/security/authentication) |
| 権限 | [`@nestjs/authorization`](https://docs.nestjs.com/security/authorization) |
| メール | [`@nestjs/mail`](https://docs.nestjs.com/application/mail) |
| ファイル（S3を含む） | [`@nestjs/storage`](https://docs.nestjs.com/application/file-storage) |
| 翻訳 | [`@nestjs/i18n`](https://docs.nestjs.com/application/i18n) |
| データベース | [`@nestjs/typeorm`](https://docs.nestjs.com/data/typeorm), [`@nestjs/drizzle`](https://docs.nestjs.com/data/drizzle), [`@nestjs/mongoose`](https://docs.nestjs.com/data/mongodb), [`@nestjs/sequelize`](https://docs.nestjs.com/data/sequelize) |
| リトライ、タイムアウト、サーキットブレーカー | [`@nestjs/resilience`](https://docs.nestjs.com/reliability/resilience) |
| 冪等性キー | [`@nestjs/idempotency`](https://docs.nestjs.com/reliability/idempotency) |
| トランザクショナルアウトボックス | [`@nestjs/outbox`](https://docs.nestjs.com/reliability/outbox) |
| Webhookの送信と受信 | [`@nestjs/webhooks`](https://docs.nestjs.com/http/webhooks) |
| 1つのインスタンスだけでのジョブ実行、ロック | [`@nestjs/locks`](https://docs.nestjs.com/reliability/locks) |
| 数日かかるプロセス | [`@nestjs/workflows`](https://docs.nestjs.com/reliability/workflows) |
| キューとスケジュールジョブ | [`@nestjs/bullmq`](https://docs.nestjs.com/application/queues), [`@nestjs/schedule`](https://docs.nestjs.com/application/task-scheduling) |
| GraphQL、WebSocket、マイクロサービス | [GraphQL](https://docs.nestjs.com/graphql/quick-start), [ゲートウェイ](https://docs.nestjs.com/websockets/gateways), [マイクロサービス](https://docs.nestjs.com/microservices/basics) |
| OpenAPI | [`@nestjs/swagger`](https://docs.nestjs.com/openapi/introduction) |
| 設定、キャッシュ、レート制限、ヘルスチェック | [`@nestjs/config`](https://docs.nestjs.com/application/configuration), [`@nestjs/cache-manager`](https://docs.nestjs.com/data/caching), [`@nestjs/throttler`](https://docs.nestjs.com/security/rate-limiting), [`@nestjs/terminus`](https://docs.nestjs.com/reliability/terminus) |

## Nestへの移行

- [Expressから](https://docs.nestjs.com/recipes/express-migration)：ルートを1つずつでも、一度にすべてでも移行できます。
- [Fastifyから](https://docs.nestjs.com/recipes/fastify-migration)：プラグインはそのまま使えます。
- [Next.jsアプリのバックエンドとして](https://docs.nestjs.com/recipes/nextjs)：ルートハンドラーを1つずつ移していけます。

## コーディングエージェントを使う

ドキュメント全体がmarkdownでも公開されており、インデックスは[docs.nestjs.com/llms.txt](https://docs.nestjs.com/llms.txt)にあります。`nest new`で作成したプロジェクトには、上記のパッケージを一覧にした`AGENTS.md`が含まれています。ほとんどのモデルは、これらのパッケージが登場する前に学習されているためです。

公式の[NestJSエージェントスキル](https://github.com/nestjs/agent-skills)は、最新のAPIと、テストでは見つからない誤りをエージェントに教えます。プロジェクトの開始、機能、認証と認可、データ、テスト、本番運用をカバーしています。次のコマンドでプロジェクトに追加します：

```bash
npx @nestjs/skills add
```

スキルは`.agents/skills`にコピーされ、CodexとCursorがそこを読み込みます。Claude Codeで使うには`--agent claude`を、両方で使うには`--agent all`を付けてください。Claude Codeではプラグインとしてもインストールできます：`claude plugin marketplace add nestjs/agent-skills`を実行してから、`claude plugin install nestjs@nestjs`を実行します。

## 哲学

<p>
近年、Node.jsの発展によって、JavaScriptはフロントエンドとバックエンドの両方でWebの「共通言語」になりました。そしてフロントエンドでは、<a href="https://angular.dev/" target="_blank">Angular</a>、<a href="https://react.dev/" target="_blank">React</a>、<a href="https://vuejs.org/" target="_blank">Vue</a>などの素晴らしいプロジェクトが生まれ、開発効率が飛躍的に向上しました。一方で、サーバーサイドでは、Node.jsエコシステム上に優れたライブラリ、ヘルパー、ツールがたくさんありますが、それらのどれもが主要な問題であるアーキテクチャを効果的に解決するものではありませんでした。
</p>

<p>Nestは、実用的なアーキテクチャをすぐに構築できることを目的としています。具体的には、テストフレンドリーで、スケーラブルで、疎結合で、運用にやさしいアプリケーションを構築できるようになっています。また、アーキテクチャはAngularにインスパイアされています。</p>

## はじめに

* To check out the [guide](https://docs.nestjs.com), visit [docs.nestjs.com](https://docs.nestjs.com). :books:
* 要查看中文 [指南](readme_zh.md), 请访问 [docs.nestjs.cn](https://docs.nestjs.cn). :books:
* [가이드](readme_kr.md) 문서는 [docs.nestjs.com](https://docs.nestjs.com)에서 확인하실 수 있습니다. :books:
* [ガイド](readme_jp.md)は [docs.nestjs.com](https://docs.nestjs.com)でご確認ください。 :books:

## 質問

質問やサポートについては、公式の[Discordチャンネル](https://discord.gg/G7Qnnhy)を使用してください。また、このリポジトリのissueリストは、バグレポートと機能リクエスト **専用** です。

## イシュー(Issues)

issueを作成する前に、必ず[Issue Reporting Checklist](https://github.com/nestjs/nest/blob/master/CONTRIBUTING.md#-submitting-an-issue)をお読みください。ガイドラインに準拠していないissueは、クローズされる場合があります。

## オブザーバビリティ

[NestJS Observe](https://observe.nestjs.com)は、Nestアプリケーション向けの公式オブザーバビリティプラットフォームです。`@nestjs/observe` SDKをインストールしてAPIキーを渡すだけで、リクエスト、バックグラウンドジョブ、エラー、ログ、分散トレースがダッシュボードに送られ始めます。スパンを手動で組み込む必要も、コレクターを運用する必要もありません。SDKがNest自身のリクエストライフサイクルにフックするため、トレースは単なるHTTPルートではなく、コントローラーとプロバイダーの呼び出しグラフのように読めます。月30万イベントまで無料で、登録不要の[ライブデモ](https://www.observe-demo.nestjs.com/dashboard)もあります。

## コンサルティング

公式サポートを利用することで、Nestコアチームからのテクニカルサポート、移行戦略、ベストプラクティスの提供、アーキテクチャの相談、PRレビュー、メンタリングを受けることができます。詳しくは[こちら](https://enterprise.nestjs.com)をご覧ください。

## サポート

Nestは、MITライセンスのオープンソースプロジェクトです。スポンサーと支援者による素晴らしいサポートによって、その発展を支えられています。参加したい場合は[こちら](https://docs.nestjs.com/support)をご覧ください。

## 連絡先

* 著者 - [Kamil Myśliwiec](https://x.com/kammysliwiec)
* ウェブサイト - [https://nestjs.com](https://nestjs.com/)
* X - [@nestframework](https://x.com/nestframework)

## ライセンス

Nest は [MIT ライセンス](https://github.com/nestjs/nest/blob/master/LICENSE) です。
