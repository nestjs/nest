import {
  Controller,
  INestMicroservice,
  Injectable,
  Module,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  AsyncOptions,
  ClientTCP,
  ClientsModule,
  MessagePattern,
  MicroserviceOptions,
  Payload,
  TcpOptions,
  Transport,
} from '@nestjs/microservices';
import { expect } from 'chai';

let port: number;

do {
  port = Math.round(Math.random() * 10000);
} while (port < 1000);

@Injectable()
class RpcOptionsProvider {
  getOptions(): TcpOptions {
    return {
      transport: Transport.TCP,
      options: {
        port,
        host: '0.0.0.0',
      },
    };
  }
}

@Controller()
class RpcController {
  @MessagePattern({ cmd: 'sum' })
  sumPayload(@Payload() payload: number[]) {
    return payload.reduce((a, b) => a + b, 0);
  }
}

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'RPC_CLIENT',
        transport: Transport.TCP,
        options: {
          port,
          host: '0.0.0.0',
        },
      },
    ]),
  ],
  controllers: [RpcController],
  providers: [RpcOptionsProvider],
})
class RpcModule {}

describe('RPC Async transport', () => {
  let app: INestMicroservice;
  let client: ClientTCP;

  beforeEach(async () => {
    app = await NestFactory.createMicroservice<
      AsyncOptions<MicroserviceOptions>
    >(RpcModule, {
      logger: false,
      inject: [RpcOptionsProvider],
      useFactory: (optionsProvider: RpcOptionsProvider) =>
        optionsProvider.getOptions(),
    });

    await app.listen();
    client = app.get('RPC_CLIENT', { strict: false });
  });

  it(`/POST`, done => {
    let retData = 0;
    client.send({ cmd: 'sum' }, [1, 2, 3, 4, 5]).subscribe({
      next: val => (retData += val),
      error: done,
      complete: () => {
        expect(retData).to.eq(15);
        done();
      },
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
