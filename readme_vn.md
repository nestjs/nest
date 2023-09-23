<p align="center">
  <a href="https://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

<p align="center">Một framework <a href="https://nodejs.org" target="_blank">Node.js</a> tiến bộ để xây dựng ứng dụng máy chủ hiệu quả và có khả năng mở rộng.</p>
<p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
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

## Mô tả

Nest là một framework dành cho việc xây dựng ứng dụng máy chủ <a href="https://nodejs.org" target="_blank">Node.js</a> hiệu quả và có khả năng mở rộng. Nó sử dụng JavaScript hiện đại, được xây dựng với <a href="https://www.typescriptlang.org" target="_blank">TypeScript</a> (duy trì tính tương thích với JavaScript thuần) và kết hợp các yếu tố của lập trình hướng đối tượng (OOP), lập trình hàm (FP), và lập trình phản ứng hàm (FRP).

<p>Bên trong, Nest sử dụng <a href="https://expressjs.com/" target="_blank">Express</a>, nhưng cũng cung cấp tính tương thích với nhiều thư viện khác, ví dụ như <a href="https://github.com/fastify/fastify" target="_blank">Fastify</a>, cho phép sử dụng dễ dàng các plugin của bên thứ ba đa dạng mà có sẵn.</p>

## Triết lý

<p>Trong những năm gần đây, nhờ sự phát triển của Node.js, JavaScript đã trở thành "ngôn ngữ chung" của web cho cả các ứng dụng front-end và back-end, Điều này đã dẫn đến sự xuất hiện của các dự án tuyệt vời như <a href="https://angular.io/" target="_blank">Angular</a>, <a href="https://github.com/facebook/react" target="_blank">React</a> và <a href="https://github.com/vuejs/vue" target="_blank">Vue</a> giúp cải thiện năng suất của các nhà phát triển và cho phép xây dựng các ứng dụng phía trước nhanh chóng, có khả năng kiểm tra và có thể mở rộng. Tuy nhiên, ở phía máy chủ, mặc dù có nhiều thư viện, trợ giúp và công cụ xuất sắc dành cho Node, nhưng không có cái nào giải quyết một vấn đề quan trọng - kiến trúc ứng dụng một cách hiệu quả.</p>
<p>Nest nhắm mục tiêu cung cấp một cấu trúc ứng dụng sẵn sàng từ đầu, cho phép tạo ra các ứng dụng dễ kiểm tra, có khả năng mở rộng, không gắn kết chặt chẽ và dễ bảo trì một cách dễ dàng. Kiến trúc này lấy cảm hứng mạnh mẽ từ Angular.</p>

## Bắt đầu

- To check out the [guide](https://docs.nestjs.com), visit [docs.nestjs.com](https://docs.nestjs.com). :books:
- 要查看中文 [指南](readme_zh.md), 请访问 [docs.nestjs.cn](https://docs.nestjs.cn). :books:
- [가이드](readme_kr.md) 문서는 [docs.nestjs.com](https://docs.nestjs.com)에서 확인하실 수 있습니다. :books:
- [ガイド](readme_jp.md)は [docs.nestjs.com](https://docs.nestjs.com)でご確認ください。 :books:
- Vui lòng xem [hướng dẫn](readme_jp.md) tại [docs.nestjs.com](https://docs.nestjs.com). :books:


## Câu hỏi

Đối với các câu hỏi và hỗ trợ, vui lòng sử dụng [kênh Discord](https://discord.gg/G7Qnnhy) chính thức. Danh sách vấn đề của kho lưu trữ này chỉ **dành riêng** cho báo cáo lỗi và yêu cầu tính năng.

## Các vấn đề

Xin vui lòng đảm bảo đọc [Danh Sách Kiểm Tra Báo Cáo Vấn Đề](https://github.com/nestjs/nest/blob/master/CONTRIBUTING.md#-submitting-an-issue) trước khi bạn báo cáo một vấn đề. Các vấn đề không tuân thủ theo hướng dẫn có thể bị đóng ngay lập tức.

## Tư vấn

Với sự hỗ trợ chính thống, bạn có thể nhận sự giúp đỡ từ các chuyên gia trực tiếp từ nhóm cốt lõi của Nest. Chúng tôi cung cấp dịch vụ hỗ trợ kỹ thuật riêng biệt, chiến lược di chuyển, lời khuyên về các thực hành tốt (và quyết định về thiết kế), xem xét và đánh giá yêu cầu kéo (PR), và bổ sung cho đội ngũ phát triển của bạn. Đọc thêm về hỗ trợ [tại đây](https://enterprise.nestjs.com).

## Ủng hộ

Nest là một dự án mã nguồn mở được cấp phép MIT. Nó có thể phát triển nhờ vào sự tài trợ và hỗ trợ từ những người ủng hộ tuyệt vời. Nếu bạn muốn tham gia, vui lòng [đọc thêm tại đây](https://docs.nestjs.com/support).

## Liên hệ

- Tác giả - [Kamil Myśliwiec](https://x.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- X - [@nestframework](https://x.com/nestframework)

## Giấy phép

Nest is [MIT licensed](LICENSE).
