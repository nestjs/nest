import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';

import { AppModule } from './nest/app.module.js';

NestFactory.create(AppModule, new FastifyAdapter(), {
  logger: false,
  bodyParser: false,
})
  .then(app => app.listen(3000))
  .catch(error => {
    console.error('Error starting Nest.js application:', error);
  });
