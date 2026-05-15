import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    forceCloseConnections: true,
  });
  app.enableShutdownHooks();
  await app.listen(3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
await bootstrap();
