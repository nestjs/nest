import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  // rawBody: incoming webhooks are verified on the bytes that were signed, not on a re-serialized body.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  // The partner API's DTOs; whitelist: properties without a decorator are dropped.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  // On SIGTERM the outbox relay and the webhook worker finish what they started.
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
