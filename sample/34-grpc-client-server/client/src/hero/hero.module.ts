import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { HeroController } from './hero.controller';
import { join } from 'path';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'HERO_PACKAGE',
        transport: Transport.GRPC,
        options: {
          url: 'localhost:50051',
          package: 'hero',
          protoPath: join(__dirname, '../../../proto/hero.proto'),
        },
      },
    ]),
  ],
  controllers: [HeroController],
})
export class HeroModule {}
