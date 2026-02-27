import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { WsAdapter } from '@nestjs/platform-ws';
import { WebSocket } from 'ws';
import { AppModule } from '../../src/app.module.js';

describe('EventsGateway (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useWebSocketAdapter(new WsAdapter(app));
    await app.listen(3000);
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('events', () => {
    it('should receive 3 events', () => {
      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket('ws://localhost:8080');
        const received: number[] = [];

        ws.on('open', () => {
          ws.send(JSON.stringify({ event: 'events', data: {} }));
        });

        ws.on('message', (raw: Buffer) => {
          const message = JSON.parse(raw.toString());
          if (message.event === 'events') {
            received.push(message.data);
            if (received.length === 3) {
              try {
                expect(received).toEqual([1, 2, 3]);
                ws.close();
                resolve();
              } catch (err) {
                ws.close();
                reject(err);
              }
            }
          }
        });

        ws.on('error', reject);

        setTimeout(() => {
          ws.close();
          reject(new Error('Timeout waiting for events'));
        }, 5000);
      });
    });
  });
});
