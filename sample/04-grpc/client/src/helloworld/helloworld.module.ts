import { Module } from '@nestjs/common';
import { HelloworldController } from './helloworld.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'HELLOWORLD_PACKAGE',
        transport: Transport.GRPC,
        options: {
          url: 'localhost:50051',
          package: 'helloworld',
          protoPath: join(__dirname, '../../../proto/helloworld.proto'),
        },
      },
    ]),
  ],
  controllers: [HelloworldController],
})
export class HelloworldModule {}
