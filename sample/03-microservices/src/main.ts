import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { ApplicationModule } from './app.module';

async function bootstrap() {
  /*const app = await NestFactory.createMicroservice(ApplicationModule, {
    retryAttempts: 5,
    retryDelay: 3000,
    transport: Transport.REDIS, 
  } as any);
  await app.listenAsync();*/
  /** Hybrid application (HTTP + (n)Microservices)*/
  const app = await NestFactory.create(ApplicationModule);
  app.connectMicroservice({
    retryAttempts: 5,
    retryDelay: 3000,
    transport: Transport.TCP, 
  } as any);

  await app.startAllMicroservicesAsync();
  await app.listen(3001);
}
bootstrap();
