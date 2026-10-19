import {
  INestMicroservice,
  Injectable,
  OnApplicationBootstrap,
  OnModuleInit,
} from '@nestjs/common';
import { CustomTransportStrategy, Server } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';

class NoopTransport extends Server implements CustomTransportStrategy {
  listen(callback: () => void) {
    callback();
  }
  close() {}
  on() {}
  unwrap<T>(): T {
    return null as T;
  }
}

@Injectable()
class HooksTracker implements OnModuleInit, OnApplicationBootstrap {
  moduleInit = 0;
  applicationBootstrap = 0;

  onModuleInit() {
    this.moduleInit++;
  }

  onApplicationBootstrap() {
    this.applicationBootstrap++;
  }
}

const createTestingModule = () =>
  Test.createTestingModule({ providers: [HooksTracker] }).compile();

describe('Init hooks', () => {
  describe('of a microservice', () => {
    let microservice: INestMicroservice;

    afterEach(async () => {
      await microservice.close();
    });

    it('should be called once by init()', async () => {
      microservice = (await createTestingModule()).createNestMicroservice({
        strategy: new NoopTransport(),
      });

      await microservice.init();
      await microservice.listen();

      expect(microservice.get(HooksTracker)).toMatchObject({
        moduleInit: 1,
        applicationBootstrap: 1,
      });
    });

    it('should be called once by listen()', async () => {
      microservice = (await createTestingModule()).createNestMicroservice({
        strategy: new NoopTransport(),
      });

      await microservice.listen();

      expect(microservice.get(HooksTracker)).toMatchObject({
        moduleInit: 1,
        applicationBootstrap: 1,
      });
    });
  });
});
