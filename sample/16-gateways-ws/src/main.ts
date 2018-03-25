import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/websockets/adapters';
import { ApplicationModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(ApplicationModule);
  app.useWebSocketAdapter(new WsAdapter(app.getHttpServer()));
  await app.listen(3000);
}
bootstrap();
