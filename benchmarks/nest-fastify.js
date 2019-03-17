'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const core_1 = require('@nestjs/core');
const fastify_platform_1 = require('@nestjs/platform-fastify');
const app_module_1 = require('./nest/app.module');
core_1.NestFactory.create(
  app_module_1.AppModule,
  new fastify_platform_1.FastifyAdapter(),
  {
    logger: false,
    bodyParser: false,
  },
).then(app => app.listen(3000));
//# sourceMappingURL=main.js.map
