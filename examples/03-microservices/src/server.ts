import * as bodyParser from 'body-parser';
import { NestFactory } from '@nestjs/core';
import { ApplicationModule } from './modules/app.module';
import { Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(ApplicationModule);
  app.connectMicroservice({
    transport: Transport.TCP,
  });

  app.use(bodyParser.json());
  await app.startAllMicroservicesAsync();
  await app.listen(3001);
}
bootstrap();
