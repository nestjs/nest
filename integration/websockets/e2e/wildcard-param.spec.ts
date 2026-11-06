import { INestApplication } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import { Test } from '@nestjs/testing';
import { WebSocketGateway } from '@nestjs/websockets';
import { AddressInfo } from 'net';
import WebSocket from 'ws';
import {
  ConnectionParamsGateway,
  MultipleParamsGateway,
  ParseIntParamGateway,
  SeparatePortParamGateway,
  SpecificFilesGateway,
  StaticFilesGateway,
  WildcardFilesGateway,
  WildcardParamGateway,
  WILDCARD_SEPARATE_PORT,
} from '../src/wildcard-param.gateway.js';

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
  let baseUrl: string;

  afterEach(async () => {
    if (ws && ws.readyState !== WebSocket.CLOSED) {
      await new Promise<void>(resolve => {
        ws.once('close', () => resolve());
        ws.terminate();
      });
    }
    if (app) {
      await app.close();
    }
  });

  describe('Single Parameter Gateway', () => {
    beforeEach(async () => {
      app = await createNestApp(WildcardParamGateway);
      await app.listen(0);
      const { port } = app.getHttpServer().address() as AddressInfo;
      baseUrl = `ws://localhost:${port}`;
    });

    it('should extract roomId parameter from URL path', async () => {
      const roomId = 'test-room-123';
      ws = new WebSocket(`${baseUrl}/chat/${roomId}/socket`);

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
          expect(response.event).toEqual('joined');
          expect(response.data.roomId).toEqual(roomId);
          expect(response.data.message).toEqual(testMessage.message);
          expect(typeof response.data.timestamp).toBe('string');
          resolve();
        });
      });
    });

    it('should handle different roomId values', async () => {
      const roomId = 'room-with-dashes-and-numbers-456';
      ws = new WebSocket(`${baseUrl}/chat/${roomId}/socket`);

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
          expect(response.data.roomId).toEqual(roomId);
          resolve();
        });
      });
    });

    it('should return all parameters when using @WsParam() without argument', async () => {
      const roomId = 'all-params-test';
      ws = new WebSocket(`${baseUrl}/chat/${roomId}/socket`);

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
          expect(response.event).toEqual('allParams');
          expect(response.data.params).toEqual(expect.any(Object));
          expect(response.data.params.roomId).toEqual(roomId);
          expect(response.data.receivedData).toEqual(testData);
          resolve();
        });
      });
    });

    it('should handle URL encoded parameters', async () => {
      const roomId = 'room%20with%20spaces';
      ws = new WebSocket(`${baseUrl}/chat/${roomId}/socket`);

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
          expect(response.data.roomId).toEqual('room with spaces');
          resolve();
        });
      });
    });
  });

  describe('Multiple Parameters Gateway', () => {
    beforeEach(async () => {
      app = await createNestApp(MultipleParamsGateway);
      await app.listen(0);
      const { port } = app.getHttpServer().address() as AddressInfo;
      baseUrl = `ws://localhost:${port}`;
    });

    it('should extract multiple parameters from complex URL path', async () => {
      const gameId = 'game-123';
      const roomId = 'room-456';
      const playerId = 'player-789';

      ws = new WebSocket(
        `${baseUrl}/game/${gameId}/room/${roomId}/player/${playerId}/socket`,
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
          expect(response.event).toEqual('moveProcessed');
          expect(response.data.gameId).toEqual(gameId);
          expect(response.data.roomId).toEqual(roomId);
          expect(response.data.playerId).toEqual(playerId);
          expect(response.data.move).toEqual(moveData);
          expect(typeof response.data.timestamp).toBe('string');
          resolve();
        });
      });
    });

    it('should get all parameters as object in multiple params scenario', async () => {
      const gameId = 'test-game';
      const roomId = 'test-room';
      const playerId = 'test-player';

      ws = new WebSocket(
        `${baseUrl}/game/${gameId}/room/${roomId}/player/${playerId}/socket`,
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
          expect(response.event).toEqual('statusUpdate');
          expect(response.data.gameId).toEqual(gameId);
          expect(response.data.roomId).toEqual(roomId);
          expect(response.data.playerId).toEqual(playerId);
          expect(response.data.status).toEqual('active');
          resolve();
        });
      });
    });

    it('should handle numeric-like parameters as strings', async () => {
      const gameId = '12345';
      const roomId = '67890';
      const playerId = '99999';

      ws = new WebSocket(
        `${baseUrl}/game/${gameId}/room/${roomId}/player/${playerId}/socket`,
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
          expect(response.data.gameId).toEqual('12345');
          expect(response.data.roomId).toEqual('67890');
          expect(response.data.playerId).toEqual('99999');
          expect(typeof response.data.gameId).toEqual('string');
          expect(typeof response.data.roomId).toEqual('string');
          expect(typeof response.data.playerId).toEqual('string');
          resolve();
        });
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      app = await createNestApp(WildcardParamGateway);
      await app.listen(0);
      const { port } = app.getHttpServer().address() as AddressInfo;
      baseUrl = `ws://localhost:${port}`;
    });

    async function expectConnectionFailure(url: string) {
      ws = new WebSocket(url);
      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => reject(new Error(`Should not connect to ${url}`)));
        ws.on('error', () => resolve());
        ws.on('unexpected-response', () => resolve());
        ws.on('close', () => resolve());
      });
    }

    it('should fail to connect to a path that does not match the pattern', async () => {
      await expectConnectionFailure(`${baseUrl}/chat/socket`);
    });

    it('should fail to connect when the path has a trailing slash', async () => {
      await expectConnectionFailure(`${baseUrl}/chat/room-1/socket/`);
    });

    it('should fail to connect when the path differs only by case', async () => {
      await expectConnectionFailure(`${baseUrl}/CHAT/room-1/socket`);
    });

    it('should reject a handshake with malformed percent-encoding', async () => {
      await expectConnectionFailure(`${baseUrl}/chat/%E0%A4%A/socket`);
    });
  });

  describe('Overlapping gateways', () => {
    it('should keep registration order when dynamic paths overlap', async () => {
      app = await createNestApp(SpecificFilesGateway, WildcardFilesGateway);
      await app.listen(0);
      const { port } = app.getHttpServer().address() as AddressInfo;
      baseUrl = `ws://localhost:${port}`;

      ws = new WebSocket(`${baseUrl}/files/1/meta`);
      const response = await new Promise<any>((resolve, reject) => {
        ws.on('error', reject);
        ws.on('message', data => resolve(JSON.parse(data.toString())));
      });

      expect(response.data.gateway).toEqual('specific');
      expect(response.data.params).toEqual({ id: '1' });
    });

    it('should route a longer wildcard path to the later gateway', async () => {
      app = await createNestApp(SpecificFilesGateway, WildcardFilesGateway);
      await app.listen(0);
      const { port } = app.getHttpServer().address() as AddressInfo;
      baseUrl = `ws://localhost:${port}`;

      ws = new WebSocket(`${baseUrl}/files/a/b/c`);
      const response = await new Promise<any>((resolve, reject) => {
        ws.on('error', reject);
        ws.on('message', data => resolve(JSON.parse(data.toString())));
      });

      expect(response.data.gateway).toEqual('wildcard');
      expect(response.data.params).toEqual({ path: ['a', 'b', 'c'] });
    });

    it('should serve a static path and a dynamic path on the same port', async () => {
      app = await createNestApp(StaticFilesGateway, WildcardFilesGateway);
      await app.listen(0);
      const { port } = app.getHttpServer().address() as AddressInfo;
      baseUrl = `ws://localhost:${port}`;

      ws = new WebSocket(`${baseUrl}/files/health`);
      const staticResponse = await new Promise<any>((resolve, reject) => {
        ws.on('error', reject);
        ws.on('message', data => resolve(JSON.parse(data.toString())));
      });
      expect(staticResponse.data.gateway).toEqual('static');
      ws.terminate();

      ws = new WebSocket(`${baseUrl}/files/a/b`);
      const dynamicResponse = await new Promise<any>((resolve, reject) => {
        ws.on('error', reject);
        ws.on('message', data => resolve(JSON.parse(data.toString())));
      });
      expect(dynamicResponse.data.gateway).toEqual('wildcard');
      expect(dynamicResponse.data.params).toEqual({ path: ['a', 'b'] });
    });
  });

  describe('handleConnection params', () => {
    it('should expose path params on the handshake request', async () => {
      app = await createNestApp(ConnectionParamsGateway);
      await app.listen(0);
      const { port } = app.getHttpServer().address() as AddressInfo;
      baseUrl = `ws://localhost:${port}`;

      ws = new WebSocket(`${baseUrl}/connected/abc`);
      const response = await new Promise<any>((resolve, reject) => {
        ws.on('error', reject);
        ws.on('message', data => resolve(JSON.parse(data.toString())));
      });

      expect(response.data.params).toEqual({ id: 'abc' });
    });
  });

  describe('Pipes', () => {
    it('should apply ParseIntPipe to @WsParam', async () => {
      app = await createNestApp(ParseIntParamGateway);
      await app.listen(0);
      const { port } = app.getHttpServer().address() as AddressInfo;
      baseUrl = `ws://localhost:${port}`;

      ws = new WebSocket(`${baseUrl}/parse/42`);
      await new Promise((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
      });

      ws.send(JSON.stringify({ event: 'echo', data: {} }));
      const response = await new Promise<any>(resolve => {
        ws.on('message', data => resolve(JSON.parse(data.toString())));
      });

      expect(response.data.id).toEqual(42);
      expect(response.data.type).toEqual('number');
    });
  });

  describe('Separate port', () => {
    it('should extract params from a dynamic path on a dedicated port', async () => {
      app = await createNestApp(SeparatePortParamGateway);
      await app.listen(0);

      ws = new WebSocket(`ws://localhost:${WILDCARD_SEPARATE_PORT}/dyn/xyz`);
      await new Promise((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
      });

      ws.send(JSON.stringify({ event: 'echo', data: {} }));
      const response = await new Promise<any>(resolve => {
        ws.on('message', data => resolve(JSON.parse(data.toString())));
      });

      expect(response.data.id).toEqual('xyz');
    });
  });

  describe('Invalid path pattern', () => {
    it('should throw when the gateway path is invalid in path-to-regexp v8', async () => {
      @WebSocketGateway({ path: '/legacy/*' })
      class InvalidWildcardGateway {}

      app = await createNestApp(InvalidWildcardGateway);
      await expect(app.listen(0)).rejects.toThrow(/named wildcards/);
    });
  });
});
