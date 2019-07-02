import { INestApplication, Scope } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';

class Meta {
  static COUNTER = 0;
  constructor() {
    Meta.COUNTER++;
  }
}

describe('NestApplicationContext get scope provider', () => {
  let server;
  let app: INestApplication;

  before(async () => {
    const module = await Test.createTestingModule({
      providers: [
        {
          provide: 'META',
          useClass: Meta,
        },
        {
          provide: 'META_REQUEST',
          useClass: Meta,
          scope: Scope.REQUEST,
        },
        {
          provide: 'META_TRANSIENT',
          useClass: Meta,
          scope: Scope.TRANSIENT,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    server = app.getHttpServer();
    await app.init();
  });

  it(`should create provider for scope default `, async () => {
    app.get('META');
    expect(Meta.COUNTER).to.be.eql(1);
    app.get('META');
    expect(Meta.COUNTER).to.be.eql(1);
    await app.resolve('META');
    expect(Meta.COUNTER).to.be.eql(1);
    await app.resolve('META');
    expect(Meta.COUNTER).to.be.eql(1);
  });

  it(`should create provider for scope request `, async () => {
    await app.resolve('META_REQUEST');
    expect(Meta.COUNTER).to.be.eql(2);
    await app.resolve('META_REQUEST');
    expect(Meta.COUNTER).to.be.eql(3);
  });

  it(`should create provider for scope transient `, async () => {
    await app.resolve('META_TRANSIENT');
    expect(Meta.COUNTER).to.be.eql(4);
    await app.resolve('META_TRANSIENT');
    expect(Meta.COUNTER).to.be.eql(5);
  });

  after(async () => {
    await app.close();
  });
});
