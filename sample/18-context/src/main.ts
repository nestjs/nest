import { NestFactory } from '@nestjs/core';
import { ApplicationModule } from './app.module';
import { AppService } from './app.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(ApplicationModule);
  const appService = app.find(AppService);
  console.log(appService.get());
}
bootstrap();
