import { NestFactory } from '@nestjs/core';
import { H3Adapter } from '@nestjs/platform-h3';

import { AppModule } from './nest/app.module.js';

const adapter = new H3Adapter();

NestFactory.create(AppModule, adapter, {
  logger: false,
  bodyParser: false,
})
  .then(app => app.listen(3000))
  .catch(error => {
    console.error('Error starting Nest.js application:', error);
  });
