import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { ApplicationModule } from './app.module';
import { join } from 'path';

async function bootstrap() {
  /** 
   * Hybrid application (HTTP + GRPC) 
   * Switch to basic microservice with NestFactory.createMicroservice():
   * 
   * const app = await NestFactory.createMicroservice(ApplicationModule, {
   *  transport: Transport.GRPC,
   *  options: {
   *    package: 'hero',
   *    protoPath: join(__dirname, './hero/hero.proto'),
   *  }
   * });
   * await app.listenAsync();
   *
  */
  const app = await NestFactory.create(ApplicationModule);
  app.connectMicroservice({
    transport: Transport.GRPC,
    options: {
      package: 'hero',
      protoPath: join(__dirname, './hero/hero.proto'),
    }
  });
  await app.startAllMicroservicesAsync();
  await app.listen(3001);
}
bootstrap();