import { NestFactory } from '@nestjs/core';
import { ApplicationModule } from './app.module';
import { AppService } from './app.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(ApplicationModule);
  const appService = app.get(AppService);
  console.log(appService.getHello());
}
bootstrap();
