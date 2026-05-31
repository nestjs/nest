import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';

import { AppModule } from './nest/app.module';

NestFactory.create(AppModule, new ExpressAdapter(), {
  logger: false,
  bodyParser: false,
})
  .then(app => app.listen(3000))
  .catch(error => {
    console.error('Error starting Nest.js application:', error);
  });
