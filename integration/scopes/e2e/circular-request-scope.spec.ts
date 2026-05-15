import { INestApplication, Scope } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { HelloController } from '../src/circular-hello/hello.controller.js';
import { HelloModule } from '../src/circular-hello/hello.module.js';
import { HelloService } from '../src/circular-hello/hello.service.js';
import { UsersService } from '../src/circular-hello/users/users.service.js';

class Meta {
  static COUNTER = 0;
  constructor(private readonly helloService: HelloService) {
    Meta.COUNTER++;
  }
}

describe('Circular request scope', () => {
  let server;
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        HelloModule.forRoot({
          provide: 'META',
          useClass: Meta,
          scope: Scope.REQUEST,
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
          .end((err, res) => {
            if (err) return end(err);
            end();
          });
      await new Promise(resolve => performHttpCall(resolve));
      await new Promise(resolve => performHttpCall(resolve));
      await new Promise(resolve => performHttpCall(resolve));
    });

    it(`should create controller for each request`, () => {
      expect(HelloController.COUNTER).toEqual(3);
    });

    it(`should create service for each request`, () => {
      expect(UsersService.COUNTER).toEqual(3);
    });

    it(`should create service for each request`, () => {
      expect(HelloService.COUNTER).toEqual(3);
    });

    it(`should create provider for each inquirer`, () => {
      expect(Meta.COUNTER).toEqual(3);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
