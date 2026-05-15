import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { io } from 'socket.io-client';
import { ErrorGateway } from '../src/error.gateway.js';

describe('ErrorGateway', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      providers: [ErrorGateway],
    }).compile();

    app = testingModule.createNestApplication();
    await app.listen(3000);
  });

  it(`should handle error`, async () => {
    const ws = io('http://localhost:8080');
    const pattern = 'push';
    const data = { test: 'test' };

    ws.emit(pattern, data);

    await new Promise<void>(resolve =>
      ws.on('exception', error => {
        expect(error).toEqual({
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

  afterEach(() => app.close());
});
