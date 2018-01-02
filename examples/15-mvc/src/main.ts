import * as express from 'express';
import { NestFactory } from '@nestjs/core';
import { ApplicationModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(ApplicationModule);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  await app.listen(3000);
}
bootstrap();
