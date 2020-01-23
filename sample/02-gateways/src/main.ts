import { NestFactory } from '@nestjs/core';
import { ApplicationModule } from './app.module';
import { RedisIoAdapter } from './adapters/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(ApplicationModule);
  app.useWebSocketAdapter(new RedisIoAdapter(app));
  await app.listen(3000);
}
bootstrap();
