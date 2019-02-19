import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ApplicationModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(ApplicationModule);
  app.useGlobalPipes(new ValidationPipe());

  const config = app.get('ConfigService');
  const port = config.getNumber('port');
  await app.listen(port);
}
bootstrap();
