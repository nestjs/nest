'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const core_1 = require('@nestjs/core');
const ultimate_express_platform_1 = require('@nestjs/platform-ultimate-express');
const app_module_1 = require('./nest/app.module');
core_1.NestFactory.create(
  app_module_1.AppModule,
  new ultimate_express_platform_1.UltimateExpressAdapter(),
  {
    logger: false,
    bodyParser: false,
  },
).then(app => app.listen(3000));