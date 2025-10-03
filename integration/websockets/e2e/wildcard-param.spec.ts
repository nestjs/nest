import { INestApplication } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as WebSocket from 'ws';
import {
  WildcardParamGateway,
  MultipleParamsGateway,
} from '../src/wildcard-param.gateway';

async function createNestApp(...gateways: any[]): Promise<INestApplication> {
  const testingModule = await Test.createTestingModule({
    providers: gateways,
  }).compile();
  const app = testingModule.createNestApplication();
  app.useWebSocketAdapter(new WsAdapter(app) as any);
  return app;
}

describe('WebSocket Wildcard URL Parameters', () => {
  let app: INestApplication;
  let ws: WebSocket;

  afterEach(async () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
    if (app) {
      await app.close();
    }
  });

  describe('Single Parameter Gateway', () => {
    beforeEach(async () => {
      app = await createNestApp(WildcardParamGateway);
      await app.listen(3000);
    });

    it('should extract roomId parameter from URL path', async () => {
      const roomId = 'test-room-123';
      ws = new WebSocket(`ws://localhost:3000/chat/${roomId}/socket`);

      await new Promise(resolve => ws.on('open', resolve));

      const testMessage = { message: 'Hello World' };
      ws.send(
        JSON.stringify({
          event: 'join',
          data: testMessage,
        }),
      );

      await new Promise<void>(resolve => {
        ws.on('message', data => {
          const response = JSON.parse(data.toString());
          expect(response.event).to.equal('joined');
          expect(response.data.roomId).to.equal(roomId);
          expect(response.data.message).to.equal(testMessage.message);
          expect(response.data.timestamp).to.be.a('string');
          resolve();
        });
      });
    });

    it('should handle different roomId values', async () => {
      const roomId = 'room-with-dashes-and-numbers-456';
      ws = new WebSocket(`ws://localhost:3000/chat/${roomId}/socket`);

      await new Promise(resolve => ws.on('open', resolve));

      ws.send(
        JSON.stringify({
          event: 'join',
          data: { message: 'Different room test' },
        }),
      );

      await new Promise<void>(resolve => {
        ws.on('message', data => {
          const response = JSON.parse(data.toString());
          expect(response.data.roomId).to.equal(roomId);
          resolve();
        });
      });
    });

    it('should return all parameters when using @WsParam() without argument', async () => {
      const roomId = 'all-params-test';
      ws = new WebSocket(`ws://localhost:3000/chat/${roomId}/socket`);

      await new Promise(resolve => ws.on('open', resolve));

      const testData = { info: 'test data' };
      ws.send(
        JSON.stringify({
          event: 'getAllParams',
          data: testData,
        }),
      );

      await new Promise<void>(resolve => {
        ws.on('message', data => {
          const response = JSON.parse(data.toString());
          expect(response.event).to.equal('allParams');
          expect(response.data.params).to.be.an('object');
          expect(response.data.params.roomId).to.equal(roomId);
          expect(response.data.receivedData).to.deep.equal(testData);
          resolve();
        });
      });
    });

    it('should handle URL encoded parameters', async () => {
      const roomId = 'room%20with%20spaces';
      ws = new WebSocket(`ws://localhost:3000/chat/${roomId}/socket`);

      await new Promise(resolve => ws.on('open', resolve));

      ws.send(
        JSON.stringify({
          event: 'join',
          data: { message: 'Encoded test' },
        }),
      );

      await new Promise<void>(resolve => {
        ws.on('message', data => {
          const response = JSON.parse(data.toString());
          expect(response.data.roomId).to.equal('room with spaces');
          resolve();
        });
      });
    });
  });

  describe('Multiple Parameters Gateway', () => {
    beforeEach(async () => {
      app = await createNestApp(MultipleParamsGateway);
      await app.listen(3000);
    });

    it('should extract multiple parameters from complex URL path', async () => {
      const gameId = 'game-123';
      const roomId = 'room-456';
      const playerId = 'player-789';

      ws = new WebSocket(
        `ws://localhost:3000/game/${gameId}/room/${roomId}/player/${playerId}/socket`,
      );

      await new Promise(resolve => ws.on('open', resolve));

      const moveData = { x: 10, y: 20, action: 'attack' };
      ws.send(
        JSON.stringify({
          event: 'move',
          data: moveData,
        }),
      );

      await new Promise<void>(resolve => {
        ws.on('message', data => {
          const response = JSON.parse(data.toString());
          expect(response.event).to.equal('moveProcessed');
          expect(response.data.gameId).to.equal(gameId);
          expect(response.data.roomId).to.equal(roomId);
          expect(response.data.playerId).to.equal(playerId);
          expect(response.data.move).to.deep.equal(moveData);
          expect(response.data.timestamp).to.be.a('string');
          resolve();
        });
      });
    });

    it('should get all parameters as object in multiple params scenario', async () => {
      const gameId = 'test-game';
      const roomId = 'test-room';
      const playerId = 'test-player';

      ws = new WebSocket(
        `ws://localhost:3000/game/${gameId}/room/${roomId}/player/${playerId}/socket`,
      );

      await new Promise(resolve => ws.on('open', resolve));

      ws.send(
        JSON.stringify({
          event: 'status',
          data: {},
        }),
      );

      await new Promise<void>(resolve => {
        ws.on('message', data => {
          const response = JSON.parse(data.toString());
          expect(response.event).to.equal('statusUpdate');
          expect(response.data.gameId).to.equal(gameId);
          expect(response.data.roomId).to.equal(roomId);
          expect(response.data.playerId).to.equal(playerId);
          expect(response.data.status).to.equal('active');
          resolve();
        });
      });
    });

    it('should handle numeric-like parameters as strings', async () => {
      const gameId = '12345';
      const roomId = '67890';
      const playerId = '99999';

      ws = new WebSocket(
        `ws://localhost:3000/game/${gameId}/room/${roomId}/player/${playerId}/socket`,
      );

      await new Promise(resolve => ws.on('open', resolve));

      ws.send(
        JSON.stringify({
          event: 'move',
          data: { test: 'numeric params' },
        }),
      );

      await new Promise<void>(resolve => {
        ws.on('message', data => {
          const response = JSON.parse(data.toString());
          expect(response.data.gameId).to.equal('12345');
          expect(response.data.roomId).to.equal('67890');
          expect(response.data.playerId).to.equal('99999');
          expect(typeof response.data.gameId).to.equal('string');
          expect(typeof response.data.roomId).to.equal('string');
          expect(typeof response.data.playerId).to.equal('string');
          resolve();
        });
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      app = await createNestApp(WildcardParamGateway);
      await app.listen(3000);
    });

    it('should fail to connect to non-matching static path', async () => {
      const promise = new Promise((resolve, reject) => {
        ws = new WebSocket('ws://localhost:3000/invalid-path');
        ws.on('open', () => reject(new Error('Should not connect')));
        ws.on('error', () => resolve('Expected error'));
        setTimeout(() => resolve('Timeout as expected'), 1000);
      });

      await promise;
    });

    it('should fail to connect to path missing required parameters', async () => {
      const promise = new Promise((resolve, reject) => {
        ws = new WebSocket('ws://localhost:3000/chat/socket'); // Missing roomId
        ws.on('open', () => reject(new Error('Should not connect')));
        ws.on('error', () => resolve('Expected error'));
        setTimeout(() => resolve('Timeout as expected'), 1000);
      });

      await promise;
    });
  });
});
