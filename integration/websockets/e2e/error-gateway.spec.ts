import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { io } from 'socket.io-client';
import { ErrorGateway } from '../src/error.gateway';

describe('ErrorGateway', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      providers: [ErrorGateway],
    }).compile();

    app = testingModule.createNestApplication({ logger: false });
    await app.listen(3000);
  });

  it(`should handle error`, async () => {
    const ws = io('http://localhost:8080');
    const pattern = 'push';
    const data = { test: 'test' };

    ws.emit(pattern, data);

    await new Promise<void>(resolve =>
      ws.on('exception', error => {
        expect(error).to.be.eql({
          status: 'error',
          message: 'test',
          cause: {
            pattern,
            data,
          },
        });
        resolve();
      }),
    );
  });

  it(`should send the unknown error payload for a WsException holding an error`, async () => {
    const ws = io('http://localhost:8080');
    const pattern = 'push-error';
    const data = {};

    ws.emit(pattern, data);

    const error = await new Promise<unknown>(resolve =>
      ws.on('exception', resolve),
    );
    ws.close();

    expect(error).to.be.eql({
      status: 'error',
      message: 'Internal server error',
      cause: {
        pattern,
        data,
      },
    });
  });

  afterEach(() => app.close());
});
