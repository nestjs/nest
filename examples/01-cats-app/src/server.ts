import { NestFactory } from '@nestjs/core';
import { ApplicationModule } from './modules/app.module';
import { ValidationPipe } from './modules/common/pipes/validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(ApplicationModule);
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(3000);
}
bootstrap();
