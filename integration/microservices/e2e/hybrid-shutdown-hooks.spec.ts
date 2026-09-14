import { INestApplication, INestMicroservice } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';

describe('Hybrid application shutdown hooks', () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('should remove the process signal listeners registered by a connected microservice', async () => {
    const baseline = process.listenerCount('SIGTERM');

    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();

    const microservice = app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port: 8999,
      },
    }) as INestMicroservice;

    microservice.enableShutdownHooks(['SIGTERM']);
    expect(process.listenerCount('SIGTERM')).to.equal(baseline + 1);

    await app.startAllMicroservices();
    await app.init();

    await app.close();
    app = undefined;

    expect(process.listenerCount('SIGTERM')).to.equal(baseline);
  });
});
