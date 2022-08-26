import { NestFactory, NestApplication } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestApplication>(AppModule);
  app.setGlobalPrefix('api');
  (app as any).httpAdapter.instance.set('json spaces', 4);
  await app.listen(3000);
}
bootstrap();
