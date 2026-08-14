import { INestApplication, Scope } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { HelloController } from '../src/circular-transient/hello.controller.js';
import { HelloModule } from '../src/circular-transient/hello.module.js';
import { HelloService } from '../src/circular-transient/hello.service.js';
import { UsersService } from '../src/circular-transient/users/users.service.js';

class Meta {
  static COUNTER = 0;
  constructor(private readonly helloService: HelloService) {
    Meta.COUNTER++;
  }
}

describe('Circular transient scope', () => {
  let server;
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        HelloModule.forRoot({
          provide: 'META',
          useClass: Meta,
          scope: Scope.TRANSIENT,
        }),
      ],
    }).compile();

    app = module.createNestApplication();
    server = app.getHttpServer();
    await app.init();
  });

  describe('when one service is request scoped', () => {
    beforeAll(async () => {
      const performHttpCall = end =>
        request(server)
          .get('/hello')
          .end(err => {
            if (err) return end(err);
            end();
          });
      await new Promise(resolve => performHttpCall(resolve));
      await new Promise(resolve => performHttpCall(resolve));
      await new Promise(resolve => performHttpCall(resolve));
    });

    it(`should create controller for each request`, async () => {
      expect(HelloController.COUNTER).toEqual(3);
    });

    it(`should create service for each request`, async () => {
      expect(UsersService.COUNTER).toEqual(3);
    });

    it(`should create service for each request`, async () => {
      expect(HelloService.COUNTER).toEqual(3);
    });

    it(`should create provider for each inquirer`, async () => {
      expect(Meta.COUNTER).toEqual(7);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
