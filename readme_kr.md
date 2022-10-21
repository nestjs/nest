<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">효율적이고 확장 가능한 서버 사이드 애플리케이션을 위한 혁신적 <a href="http://nodejs.org" target="_blank">Node.js</a> 프레임워크.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
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

Nest는 효율적이고 확장 가능한 <a href="http://nodejs.org" target="_blank">Node.js</a> 서버 사이드 애플리케이션을 빌드하기 위한 프레임워크입니다. Nest는 모던 Javascript를 사용하고 <a href="http://www.typescriptlang.org" target="_blank">TypeScript</a>로 빌드되었으며(순수 자바스크립트와 호환), OOP(객체 지향 프로그래밍), FP(함수형 프로그래밍), FRP(함수 반응형 프로그래밍)의 요소들이 결합되어 있습니다.

<p>Nest는 내부적으로 <a href="https://expressjs.com/" target="_blank">Express</a>를 사용하지만, <a href="https://github.com/fastify/fastify" target="_blank">Fastify</a>와 같은 타 라이브러리들과의 호환성을 광범위하게 제공하며 많은 서드파티 플러그인들을 손쉽게 사용할 수 있게 해줍니다.</p>

## 철학

<p>최근 몇 년간 Javascript는 Node.js의 발전에 따라 웹의 프론트엔드와 백엔드에 있어서 "공용어"가 되었습니다. 그리고 프론트엔드에서는 <a href="https://angular.io/" target="_blank">Angular</a>와 <a href="https://github.com/facebook/react" target="_blank">React</a>, <a href="https://github.com/vuejs/vue" target="_blank">Vue</a>와 같이 멋진 프로젝트들이 등장하여 개발자의 생산성을 향상시켰으며, 빠르고 테스트와 확장이 가능한 프론트엔드 애플리케이션을 만들 수 있게 해주었습니다. 하지만 서버 사이드에서는 Node.js를 위한 우수한 라이브러리와 툴이 많은 가운데, 주요 문제를 효과적으로 해결하는 것은 없었습니다. 그 주요 문제란 바로 아키텍처(architecture)입니다.</p>
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

## 자문

공식 지원을 통해 Nest core 팀의 전문적인 도움을 받을 수 있습니다. 우리는 전담 기술 지원, 마이그레이션 전략, 모범 사례 및 설계에 대한 조언, PR 리뷰, 팀 보강에 대한 도움을 제공합니다. 더 자세한 내용은 [공식 지원 페이지](https://enterprise.nestjs.com)에서 확인해주세요.

## 서포트

Nest는 MIT License 오픈 소스 프로젝트이며, 감사하게도 후원자들과 굉장한 기여자들의 서포트를 통해서 더욱 성장할 수 있습니다. 참여하고 싶으시다면 [서포트 문서](https://docs.nestjs.com/support)를 확인해주세요.

## 연락처

* Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
* Website - [https://nestjs.com](https://nestjs.com/)
* Twitter - [@nestframework](https://twitter.com/nestframework)

## 라이센스

Nest is [MIT licensed](LICENSE).
