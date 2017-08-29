import * as bodyParser from 'body-parser';
import { NestFactory } from '@nestjs/core';
import { ApplicationModule } from './modules/app.module';
import { HttpExceptionFilter } from './modules/common/filters/http-exception.filter';
import { ValidationPipe } from './modules/common/pipes/validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(ApplicationModule);

  app.use(bodyParser.json());
  app.useGlobalPipes(new ValidationPipe());

  await app.listen(3000);
}
bootstrap();
