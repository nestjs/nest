<p align="center">
  <a href="https://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">Verimli ve ölçeklenebilir sunucu tarafı uygulamaları oluşturmak için modern bir <a href="https://nodejs.org" target="_blank">Node.js</a> framework'ü.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Versiyonu" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Paket Lisansı" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM İndirmeleri" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Open Collective Destekçileri" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Open Collective Sponsorları" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Bağış-PayPal-ff3f59.svg"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Bizi%20Destekleyin-Open%20Collective-41B883.svg" alt="Bizi Destekleyin"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Takip%20Et"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Açıklama

Nest, verimli ve ölçeklenebilir <a href="https://nodejs.org" target="_blank">Node.js</a> sunucu tarafı uygulamaları oluşturmak için bir framework'tür. Modern JavaScript kullanır, <a href="https://www.typescriptlang.org" target="_blank">TypeScript</a> ile geliştirilmiştir (saf JavaScript ile uyumluluğu korur) ve OOP (Nesne Yönelimli Programlama), FP (Fonksiyonel Programlama) ve FRP (Fonksiyonel Reaktif Programlama) unsurlarını birleştirir.

<p>Arka planda, Nest <a href="https://expressjs.com/" target="_blank">Express</a>'i kullanır, ancak aynı zamanda <a href="https://github.com/fastify/fastify" target="_blank">Fastify</a> gibi birçok başka kütüphane ile uyumluluk sağlar. Bu, mevcut olan sayısız üçüncü taraf eklentiyi kolayca kullanmayı mümkün kılar.</p>

## Felsefe

<p>Son yıllarda, Node.js sayesinde, JavaScript hem ön uç hem de arka uç uygulamaları için web'in "lingua franca"sı haline geldi ve <a href="https://angular.io/" target="_blank">Angular</a>, <a href="https://github.com/facebook/react" target="_blank">React</a> ve <a href="https://github.com/vuejs/vue" target="_blank">Vue</a> gibi harika projelerin ortaya çıkmasına yol açtı. Bu projeler, geliştirici verimliliğini artırır ve hızlı, test edilebilir ve genişletilebilir ön uç uygulamaları oluşturmayı mümkün kılar. Ancak, sunucu tarafında, Node için birçok mükemmel kütüphane, yardımcı araç ve araç seti olmasına rağmen, hiçbiri ana sorunu - mimariyi - etkili bir şekilde çözmez.</p>
<p>Nest, kutudan çıktığı gibi yüksek derecede test edilebilir, ölçeklenebilir, gevşek bağlı ve kolayca sürdürülebilir uygulamalar oluşturmayı sağlayan bir uygulama mimarisi sunmayı amaçlar. Mimari, büyük ölçüde Angular'dan ilham almıştır.</p>

## Başlarken

- [Kılavuzu](https://docs.nestjs.com) kontrol etmek için [docs.nestjs.com](https://docs.nestjs.com) adresini ziyaret edin. :books:
- To check out the [guide](Readme.md), visit [docs.nestjs.com](https://docs.nestjs.com). :books:
- 要查看中文 [指南](readme_zh.md), 请访问 [docs.nestjs.cn](https://docs.nestjs.cn). :books:
- [가이드](readme_kr.md) 문서는 [docs.nestjs.com](https://docs.nestjs.com)에서 확인하실 수 있습니다. :books:
- [ガイド](readme_jp.md)は [docs.nestjs.com](https://docs.nestjs.com)でご確認ください。 :books:

## Sorular

Sorular ve destek için lütfen resmi [Discord kanalı](https://discord.gg/G7Qnnhy) kullanın. Bu depo için sorun listesi **yalnızca** hata raporları ve özellik istekleri içindir.

## Sorunlar

Lütfen bir sorun açmadan önce [Sorun Bildirme Kontrol Listesini](https://github.com/nestjs/nest/blob/master/CONTRIBUTING.md#-submitting-an-issue) okuyun. Yönergelere uymayan sorunlar hemen kapatılabilir.

## Danışmanlık

Resmi destekle, doğrudan Nest çekirdek ekibinden uzman yardımı alabilirsiniz. Özel teknik destek, geçiş stratejileri, en iyi uygulamalar (ve tasarım kararları) hakkında tavsiyeler, PR incelemeleri ve ekip genişletme hizmetleri sunuyoruz. [Destek hakkında daha fazla bilgi edinin](https://enterprise.nestjs.com).

## Destek

Nest, MIT lisanslı bir açık kaynak projesidir. Harika destekçiler ve sponsorlar sayesinde büyüyebilir. Onlara katılmak isterseniz, lütfen [buradan daha fazla bilgi edinin](https://docs.nestjs.com/support).

#### Ana Sponsorlar

<table style="text-align:center;">
<tr>
<td><a href="https://trilon.io" target="_blank"><img src="https://nestjs.com/img/trilon.svg" width="200" valign="middle" /></a></td>
<td><a href="https://microsoft.com/" target="_blank"><img src="https://nestjs.com/img/logos/microsoft-logo.png" width="180" valign="middle" /></a></td>
<td><a href="https://mojam.co" target="_blank"><img src="https://nestjs.com/img/logos/mojam-logo.png" width="80" valign="middle" /></a></td>
<td><a href="https://marblism.com?utm_source=nest" target="_blank"><img src="https://nestjs.com/img/logos/marblism-logo.png" width="180" valign="middle" /></a></td>
<td><a href="https://valor-software.com/" target="_blank"><img src="https://docs.nestjs.com/assets/sponsors/valor-software.png" width="170" valign="middle" /></a></td>
<td><a href="https://amplication.com/" target="_blank"><img src="https://nestjs.com/img/logos/amplication-logo.svg" width="190" valign="middle" /></a></td>
</tr>
</table>

#### Altın Sponsorlar

<table style="text-align:center;">
<tr>
<td><a href="https://www.redhat.com" target="_blank"><img src="https://nestjs.com/img/logos/red-hat-logo.svg" width="200" valign="middle" /></a></td>
<td><a href="https://github.com/Sanofi-IADC" target="_blank"><img src="https://docs.nestjs.com/assets/sponsors/sanofi.png" width="180" valign="middle" /></a></td>
<td><a href="https://nx.dev" target="_blank"><img src="https://nestjs.com/img/logos/nx-logo.png" height="45" valign="middle" /></a></td>
<td><a href="https://intrinsic.ventures/" target="_blank"><img src="https://nestjs.com/img/logos/intrinisic-logo.png" width="210" valign="middle" /></a></td>
<td><a href="https://jetbrains.com/" target="_blank"><img src="https://nestjs.com/img/logos/jetbrains-logo.svg" width="90" valign="middle" /></a></td>
</tr>
<tr>
<td><a href="https://snyk.co/nestjs" target="_blank"><img src="https://nestjs.com/img/logos/snyk-logo-black.png" width="185" valign="middle" /></a></td>
<td><a href="https://fuseautotech.com/" target="_blank"><img src="https://nestjs.com/img/logos/fuse-logo.svg" width="105" valign="middle" /></a></td>
<td><a href="https://ridicorp.com/career/" target="_blank"><img src="https://nestjs.com/img/logos/ridi-logo.svg" width="105" valign="middle" /></a></td>
<td><a href="https://www.movavi.com/imovie-for-windows.html" target="_blank"><img src="https://nestjs.com/img/logos/movavi-logo.svg" width="105" valign="middle" /></a></td>
<td><a href="https://skunk.team" target="_blank"><img src="https://nestjs.com/img/logos/skunk-logo.png" height="60" valign="middle" /></a></td>
</tr>
</table>

#### Gümüş Sponsorlar

<table style="text-align:center;">
<tr>
<td><a href="https://www.mercedes-benz.com/" target="_blank"><img src="https://nestjs.com/img/logos/mercedes-logo.png" width="100" valign="middle" /></a></td>
<td><a href="https://www.dinii.jp/" target="_blank"><img src="https://nestjs.com/img/logos/dinii-logo.png" width="65" valign="middle" /></a></td>
<td><a href="https://bloodycase.com/?promocode=NEST" target="_blank"><img src="https://nestjs.com/img/logos/bloodycase-logo.png" width="65" valign="middle" /></a></td>
<td><a href="https://handsontable.com/docs/react-data-grid/?utm_source=NestJS_GH&utm_medium=sponsorship&utm_campaign=library_sponsorship_2024" target="_blank"><img src="https://nestjs.com/img/logos/handsontable-dark-logo.svg#2" width="150" valign="middle" /></a></td>
<td align="center" valign="middle"><a href="https://www.itflashcards.com/" target="_blank"><img src="https://nestjs.com/img/logos/it_flashcards-logo.png" width="170" valign="middle" /></a></td>
<td align="center" valign="middle"><a href="https://arcjet.com/?ref=nestjs" target="_blank"><img src="https://nestjs.com/img/logos/arcjet-logo.svg" width="170" valign="middle" /></a></td>
</tr>
</table>

#### Sponsorlar

<table>
<tr>
<td align="center" valign="middle"><a href="https://www.swingdev.io" target="_blank"><img src="https://nestjs.com/img/logos/swingdev-logo.svg#1" width="110" valign="middle" /></a></td>
<td align="center" valign="middle"><a href="https://www.novologic.com/" target="_blank"><img src="https://nestjs.com/img/logos/novologic.png" width="110" valign="middle" /></a></td>
<td align="center" valign="middle"><a href="https://mantro.net/" target="_blank"><img src="https://nestjs.com/img/logos/mantro-logo.svg" width="95" valign="middle" /></a></td>
<td align="center" valign="middle"><a href="https://triplebyte.com/" target="_blank"><img src="https://nestjs.com/img/logos/triplebyte.png" width="107" valign="middle" /></a></td>
<td align="center" valign="middle"><a href="https://nearpod.com/" target="_blank"><img src="https://nestjs.com/img/logos/nearpod-logo.svg" width="100" valign="middle" /></a></td>
<td align="center" valign="middle"><a href="https://genuinebee.com/" target="_blank"><img src="https://nestjs.com/img/logos/genuinebee.svg" width="97" valign="middle" /></a></td>
</tr>
<tr>
<td align="center" valign="middle"><a href="https://vpn-review.com/vpn-for-torrenting" target="_blank"><img src="https://nestjs.com/img/logos/vpn-review-logo.png" width="85" valign="middle" /></a></td>
<td align="center" valign="middle"><a href="https://lambda-it.ch/" target="_blank"><img src="https://nestjs.com/img/logos/lambda-it-logo.svg" width="115" valign="middle" /></a></td>
<td align="center" valign="middle"><a href="https://rocketech.it/cases/?utm_source=google&utm_medium=badge&utm_campaign=nestjs" target="_blank"><img src="https://nestjs.com/img/logos/rocketech-logo.svg" width="110" valign="middle" /></a></td>
<td align="center" valign="middle"><a href="https://www.anonymistic.com/" target="_blank"><img src="https://nestjs.com/img/logos/anonymistic-logo.png" width="125" valign="middle" /></a></td>
<td align="center" valign="middle"><a href="https://www.naologic.com/" target="_blank"><img src="https://nestjs.com/img/logos/naologic-logo.svg" width="125" valign="middle" /></a></td>
<td align="center" valign="middle"><a href="https://triplecore.io" target="_blank"><img src="https://nestjs.com/img/logos/triplecore-logo.svg" width="50" valign="middle" /></a></td>
</tr>
<tr>
<td align="center" valign="middle"><a href="https://thecasinowizard.com/bonuses/no-deposit-bonuses/" target="_blank"><img src="https://nestjs.com/img/logos/casinowizard-logo.png" width="120" valign="middle" /></a></td>
<td align="center" valign="middle"><a href="https://polygon-software.ch/" target="_blank"><img src="https://nestjs.com/img/logos/polygon-logo.svg" width="120" valign="middle" /></a></td>
<td align="center" valign="middle"><a href="https://boringowl.io/" target="_blank"><img src="https://nestjs.com/img/logos/boringowl-logo.svg" width="120" valign="middle" /></a></td>
<td align="center" valign="middle"><a href="https://nordbot.app/" target="_blank"><img src="https://nestjs.com/img/logos/nordbot-logo.png" width="120" valign="middle" /></a></td>
<td align="center" valign="middle"><a href="https://doppio.sh/" target="_blank"><img src="https://nestjs.com/img/logos/dopiosh-logo.png" width="50" valign="middle" /></a></td>
<td align="center" valign="middle"><a href="https://www.hingehealth.com/" target="_blank"><img src="https://nestjs.com/img/logos/hinge-health-logo.svg" width="100" valign="middle" /></a></td>
</tr>
<tr>
<td align="center" valign="middle"><a href="https://julienferand.dev/" target="_blank"><img src="https://nestjs.com/img/logos/julienferand-logo.jpeg" width="55" valign="middle" /></a></td>
<td align="center" valign="middle"><a href="https://www.tripoffice.com/" target="_blank"><img src="https://nestjs.com/img/logos/tripoffice-logo.png" width="140" valign="middle" /></a></td>
<td align="center" valign="middle"><a href="https://solcellsforetag.se/" target="_blank"><img src="https://nestjs.com/img/logos/solcellsforetag-logo.svg" width="140" valign="middle" /></a></td>
<td align="center" valign="middle"><a href="https://www.route4me.com/" target="_blank"><img src="https://nestjs.com/img/logos/route4me-logo.svg" width="100" valign="middle" /></a></td>
<td align="center" valign="middle"><a href="https://www.slotsup.com/" target="_blank"><img src="https://nestjs.com/img/logos/slotsup-logo.png" width="60" valign="middle" /></a></td>
</tr>
</table>

## Destekçiler

<a href="https://opencollective.com/nest" target="_blank"><img src="https://opencollective.com/nest/backers.svg?width=1000"></a>

## İletişimde Kalın

- Yazar - [Kamil Myśliwiec](https://x.com/kammysliwiec)
- Web Sitesi - [https://nestjs.com](https://nestjs.com/)
- X - [@nestframework](https://x.com/nestframework)

## Lisans

Nest [MIT lisansı](LICENSE) ile lisanslanmıştır.
