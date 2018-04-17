import { Transport } from '@nestjs/microservices';
import { join } from 'path';

export const grpcClientOptions = {
  transport: Transport.GRPC,
  options: {
    package: 'hero',
    protoPath: join(__dirname, './hero/hero.proto'),
  },
};
