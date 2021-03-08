<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">효율적이고 확장가능한 서버-사이드 애플리케이션을 위한 혁신적인 <a href="http://nodejs.org" target="_blank">Node.js</a> 프레임워크.</p>
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

Nest는 효과적이고, 확장 가능한 <a href="http://nodejs.org" target="_blank">Node.js</a> 서버 사이드 애플리케이션을 빌드하기 위한 프레임워크입니다. Nest는 모던 Javascript를 사용하고, <a href="http://www.typescriptlang.org" target="_blank">TypeScript</a>로 빌드되었으며.(순수 자바스크립트와 호환성을 유지합니다)  OOP(객체 지향 프로그래밍), FP(함수형 프로그래밍), FRP(함수 반응형 프로그래밍)의 요소들이 결합되었습니다.

<p>Under the hood, Nest makes use of 내부적으로 Nest는 Express를 이용해서 개발되었을 뿐만 아니라 <a href="https://expressjs.com/" target="_blank">Express</a>, 다른 여러 범위의 라이브러리들과의 호환성을 제공합니다. 예시.<a href="https://github.com/fastify/fastify" target="_blank">Fastify</a>는 무수한 서드파티 플러그인들을 쉽게 사용하게 만듭니다.</p>

## 철학

<p>최근 몇년 간, Node.js 덕분에 Javascript는 웹의 프론트와 백엔드에서 사용하는 "공통어"가 되었고, 이것은 개발자의 생산성을 향상 시켜주고, 빠르고, 테스트 가능하고 확장가능한 프론트엔드 애플리케이션의 개발을 가능하게 해주는 <a href="https://angular.io/" target="_blank">Angular</a>와 <a href="https://github.com/facebook/react" target="_blank">React</a>, <a href="https://github.com/vuejs/vue" target="_blank">Vue</a>등의 멋진 프로젝트들이 등장했지만. 이와 반해 서버 사이드 분야에서는 Node의 도우미, 도구인 많은 훌륭한 라이브러리가 있지만, 이 중 어느것도 가장 중요한 문제를 효과적으로 해결하지 못했습니다. - 구조(architecture)의 문제.</p>
<p>Nest는 간편하게 높은 수준으로 테스트 가능하고, 확장가능하면서, 느슨하게 결합되며, 애플리케이션을 쉽게 유지할 수 있는 혁신적인 애플리케이션 구조(architecture)를 제공하는 것을 목표로 합니다. Nest의 구조(architecture)는 Angular에 많은 영감을 받았습니다. </p>

## 시작하려면

* To check out the [guide](https://docs.nestjs.com), visit [docs.nestjs.com](https://docs.nestjs.com). :books:
* 要查看中文 [指南](readme_zh.md), 请访问 [docs.nestjs.cn](https://docs.nestjs.cn). :books:
* [가이드](readme_kr.md)를 확인하려면, [docs.nestjs.com](https://docs.nestjs.com)를 방문하세요.:books: 

## 질문

질문하거나 또는 지원받으려면 공식 [디스코드 채널](https://discord.gg/G7Qnnhy)을 이용해주세요.
이 레파지토리의 이슈 목록은 **오직** 버그 리포트와, 기능 요청만 가능합니다. 


## 이슈(Issues)


 Issue를 제보하기 전에 [Issue Reporting 체크리스트](https://github.com/nestjs/nest/blob/master/CONTRIBUTING.md#-submitting-an-issue)를 확인해주세요. 가이드라인에 맞지 않는 이슈들은 즉시 세션이 닫힐 수 있습니다.


## 자문

공식적인 지원을 통해, Nest core 팀의 전문적인 도움을 받을 수 있습니다. 우리는, 전념적 기술 지원, 이주(migration) 전략, 모범사례에 대한 조언(및 설계 결정), PR 리뷰, 팀 증대등을 제공합니다. 더 많은 내용을 보시려면 [지원](https://enterprise.nestjs.com)을 방문해주세요.

## 지원

Nest는 MIT-licensed 오픈 소스 프로젝트 입니다. Nest는 후원자와, 놀라운 기여자들의 지원으로 성장할 수 있습니다. 참여하고 싶으시다면 [여기](https://docs.nestjs.com/support)를 방문해주세요.


#### 주요 스폰서
<table style="text-align:center;"><tr><td>
<a href="https://github.com/Sanofi-IADC" target="_blank"><img src="https://docs.nestjs.com/assets/sponsors/sanofi.png" width="180" valign="middle" /></a></td>
<td>
<a href="https://trilon.io" target="_blank"><img src="https://nestjs.com/img/trilon.svg" width="200" valign="middle" /></a></td>
</tr></table>

#### Gold 스폰서

<table style="text-align:center;"><tr><td>
<a href="https://valor-software.com/" target="_blank"><img src="https://docs.nestjs.com/assets/sponsors/valor-software.png" width="170" valign="middle" /></a></td></tr></table>

#### Silver 스폰서

<table style="text-align:center;"><tr><td>
<a href="https://neoteric.eu/" target="_blank"><img src="https://nestjs.com/img/neoteric-cut.png" width="120" valign="middle" /></a> </td><td>
  <a href="http://gojob.com" target="_blank"><img src="http://nestjs.com/img/gojob-logo.png" valign="middle" width="100" /></a> </td><td>
<a href="http://www.leogistics.com" target="_blank"><img src="https://nestjs.com/img/leogistics-logo.jpeg" width="150" valign="middle" /></td><td>
<a href="http://www.meetdandy.com" target="_blank"><img src="https://nestjs.com/img/dandy-wide-logo.png" width="150" valign="middle" /></td></tr></table>

#### 스폰서

<table><tr><td align="center" valign="middle">
<a href="https://www.swingdev.io" target="_blank"><img src="https://nestjs.com/img/swingdev-logo.svg#1" width="110" valign="middle" /> </a></td><td align="center" valign="middle">
<a href="https://www.novologic.com/" target="_blank"><img src="https://nestjs.com/img/novologic.png" width="110" valign="middle" /></a> </td><td align="center" valign="middle">
<a href="https://ever.co/" target="_blank"><img src="https://nestjs.com/img/ever-logo.png" width="72" valign="middle" /></a>  </td><td align="center" valign="middle">
<a href="https://blokt.com" target="_blank"><img src="https://nestjs.com/img/blokt-logo.png" width="120" valign="middle" /></a>  </td><td align="center" valign="middle"> 
  <a href="http://architectnow.net/" target="_blank"><img src="https://nestjs.com/img/architectnow.png" width="125" valign="middle" /></a> </td><td align="center" valign="middle">
  <a href="https://quander.io/" target="_blank"><img src="https://nestjs.com/img/quander.png" width="100" valign="middle" /></a> </td></tr><tr><td align="center" valign="middle">
  <a href="https://mantro.net/" target="_blank"><img src="https://nestjs.com/img/mantro-logo.svg" width="95" valign="middle" /></a> </td><td align="center" valign="middle">
  <a href="https://triplebyte.com/" target="_blank"><img src="https://nestjs.com/img/triplebyte.png" width="107" valign="middle" /></a> </td><td align="center" valign="middle">
<a href="https://reposit.co.uk/" target="_blank"><img src="https://nestjs.com/img/reposit-logo.png" width="71" valign="middle" /></a></td><td align="center" valign="middle">
<a href="https://nearpod.com/" target="_blank"><img src="https://nestjs.com/img/nearpod-logo.svg" width="100" valign="middle" /></a> </td><td align="center" valign="middle">
<a href="https://clay.global/" target="_blank"><img src="https://nestjs.com/img/clay-logo.svg" width="75" valign="middle" /></a> </td><td align="center" valign="middle">
<a href="https://firesticktricks.com" target="_blank"><img src="https://nestjs.com/img/firesticktricks-logo.png" width="120" valign="middle" /></a></td></tr><tr><td align="center" valign="middle">
<a href="https://www.codeguesser.co.uk" target="_blank"><img src="https://nestjs.com/img/codeguesser-logo.svg" width="120" valign="middle" /></a> </td><td align="center" valign="middle">
<a href="https://f-a.nz/" target="_blank"><img src="https://nestjs.com/img/franz.svg" width="80" valign="middle" /></a> </td><td align="center" valign="middle">
<a href="https://sparkfabrik.com/" target="_blank"><img src="https://nestjs.com/img/sparkfabrik-logo.png" width="120" valign="middle" /></a></td><td align="center" valign="middle"><a href="https://www.thebigphonestore.co.uk/" target="_blank"><img src="https://nestjs.com/img/the-big-phone-store-logo.png" width="65" valign="middle" /></a></td>
  <td align="center" valign="middle">
  <a href="https://genuinebee.com/" target="_blank"><img src="https://nestjs.com/img/genuinebee.svg" width="97" valign="middle" /></a> </td>
<td align="center" valign="middle"><a href="https://sanyodigital.com/" target="_blank"><img src="https://nestjs.com/img/sanyo-digital.png" width="130" valign="middle" /></a></td></tr><tr><td align="center" valign="middle"><a href="https://vpn-review.com/vpn-for-torrenting" target="_blank"><img src="https://nestjs.com/img/vpn-review-logo.png" width="85" valign="middle" /></a></td><td align="center" valign="middle"><a href="https://lambda-it.ch/" target="_blank"><img src="https://nestjs.com/img/lambda-it-logo.svg" width="115" valign="middle" /></a></td><td align="center" valign="middle"><a href="https://pickwriters.com/top-10-translation-services" target="_blank"><img src="https://nestjs.com/img/pickwriters-logo.png" width="40" valign="middle" /></a></td><td align="center" valign="middle"><a href="https://thewordpoint.com/services/localization" target="_blank"><img src="https://nestjs.com/img/thewordpoint-logo.png" width="40" valign="middle" /></a></td>
<td align="center" valign="middle"><a href="https://meercode.io/" target="_blank"><img src="https://nestjs.com/img/meercode-logo.png" width="60" valign="middle" /></a></td>
  <td align="center" valign="middle"><a href="https://www.najlepszeplatformyforex.pl/blog/broker-xtb/" target="_blank"><img src="https://nestjs.com/img/npf-logo.jpg" width="200" valign="middle" /></a></td></tr><tr>
<td align="center" valign="middle"><a href="https://thestandarddaily.com/" target="_blank"><img src="https://nestjs.com/img/the-standard-daily-logo.png" width="180" valign="middle" /></a></td>
<td align="center" valign="middle"><a href="https://houseofangular.io/" target="_blank"><img src="https://nestjs.com/img/house-of-angular.png" width="100" valign="middle" /></a></td>
<td align="center" valign="middle"><a href="https://rocketech.it/cases/?utm_source=google&utm_medium=badge&utm_campaign=nestjs" target="_blank"><img src="https://nestjs.com/img/rocketech-logo.svg" width="110" valign="middle" /></a></td>
  </tr></table>

## 기여자

<a href="https://opencollective.com/nest" target="_blank"><img src="https://opencollective.com/nest/backers.svg?width=1000"></a>

## Stay in touch

* Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
* Website - [https://nestjs.com](https://nestjs.com/)
* Twitter - [@nestframework](https://twitter.com/nestframework)

## 라이센스

Nest is [MIT licensed](LICENSE).
