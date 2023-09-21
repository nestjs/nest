import { NestFactory } from '@nestjs/core';
import { BunWsAdapter } from '@nestjs/platform-bun-ws';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new BunWsAdapter(app));

  await app.listen(3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
