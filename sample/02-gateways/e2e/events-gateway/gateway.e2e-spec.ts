import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';
import { io, Socket } from 'socket.io-client';

describe('EventsGateway', () => {
  let app: INestApplication;
  let socket: Socket;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.listen(3000);
  });

  beforeEach(() => {
    return new Promise<void>(resolve => {
      socket = io('http://localhost:3000');
      socket.on('connect', () => {
        resolve();
      });
    });
  });

  describe('findAll', () => {
    it('should receive 3 numbers', () => {
      return new Promise<void>((resolve, reject) => {
        let eventCount = 1;
        socket.emit('events', { test: 'test' });
        socket.on('events', data => {
          try {
            expect(data).toBe(eventCount);
          } catch (err) {
            reject(err);
            return;
          }
          if (++eventCount > 3) {
            resolve();
          }
        });
      });
    });
  });

  describe('identity', () => {
    it('should return the same number has what was sent', () => {
      return new Promise<void>((resolve, reject) => {
        socket.emit('identity', 0, response => {
          try {
            expect(response).toBe(0);
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      });
    });
  });

  afterEach(() => {
    socket.disconnect();
  });

  afterAll(async () => {
    await app.close();
  });
});
