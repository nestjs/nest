import { NestFactory } from '@nestjs/core';
import { NodeAdapter } from '@nestjs/platform-node';

import { AppModule } from './nest/app.module';

NestFactory.create(AppModule, new NodeAdapter(), {
  logger: false,
  bodyParser: false,
})
  .then(app => app.listen(3000))
  .catch(error => {
    console.error('Error starting Nest.js application:', error);
  });
