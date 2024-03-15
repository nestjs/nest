import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        url: '0.0.0.0:50051',
        package: ['hero', 'helloworld'],
        protoPath: [
          join(__dirname, '../../proto/hero.proto'),
          join(__dirname, '../../proto/helloworld.proto'),
        ],
      },
    },
  );
  await app.listen();
}
bootstrap();
