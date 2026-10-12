import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  Param,
  Post,
} from '@nestjs/common';
import {
  ExpressAdapter,
  NestExpressApplication,
} from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { listenOnLoopback } from '../../../_support/listen-on-loopback.js';

describe('Lifecycle hooks (Express Application)', () => {
  let app: NestExpressApplication;
  let adapter: ExpressAdapter;
  let finishController: () => void;
  let controllerFinished: Promise<void>;
  let controllerCalls: number;
  let createdIds: string[];

  @Controller()
  class TestController {
    @Get()
    async get() {
      controllerCalls++;
      await new Promise(resolve => setImmediate(resolve));
      finishController();
      return 'ok';
    }

    @Get('error')
    async fail() {
      await Promise.resolve();
      throw new BadRequestException('Controller failed');
    }

    @Post(':id')
    async create(@Param('id') id: string) {
      await new Promise(resolve => setImmediate(resolve));
      createdIds.push(id);
      return { id };
    }
  }

  beforeEach(async () => {
    controllerCalls = 0;
    createdIds = [];
    controllerFinished = new Promise<void>(resolve => {
      finishController = resolve;
    });
    adapter = new ExpressAdapter();
    const module = await Test.createTestingModule({
      controllers: [TestController],
    }).compile();
    app = module.createNestApplication<NestExpressApplication>(adapter, {
      logger: false,
    });
    await listenOnLoopback(app);
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it.each(['throw', 'reject', 'done twice'])(
    'preserves the controller response after hook completion (%s)',
    async completion => {
      const error = new Error('Late hook failure');
      const logError = vi
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});
      adapter.setOnRequestHook((_req, _res, done) => {
        done();
        if (completion === 'done twice') {
          done();
        } else if (completion === 'throw') {
          throw error;
        } else {
          return Promise.reject(error);
        }
      });

      const response = await request(app.getHttpServer())
        .get('/')
        .timeout(2000);
      await controllerFinished;
      await new Promise(resolve => setImmediate(resolve));

      expect(response.status).toBe(200);
      expect(response.text).toBe('ok');
      expect(controllerCalls).toBe(1);
      if (completion === 'done twice') {
        expect(logError).not.toHaveBeenCalled();
      } else {
        expect(logError).toHaveBeenCalledExactlyOnceWith(error);
      }
    },
  );

  it('still sends controller errors to Nest exception filters', async () => {
    adapter.setOnRequestHook((_req, _res, done) => done());

    const response = await request(app.getHttpServer())
      .get('/error')
      .timeout(2000)
      .expect(400);

    expect(response.body.message).toBe('Controller failed');
  });

  it.each(['resolve', 'reject', 'done twice'])(
    'creates a record once when an async request hook calls done (%s)',
    async completion => {
      const error = new Error('Late hook failure');
      const logError = vi
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});
      adapter.setOnRequestHook(async (_req, _res, done) => {
        await Promise.resolve();
        done();
        if (completion === 'reject') {
          throw error;
        } else if (completion === 'done twice') {
          done();
        }
      });

      const response = await request(app.getHttpServer())
        .post('/created')
        .timeout(2000);
      await new Promise(resolve => setImmediate(resolve));

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ id: 'created' });
      expect(createdIds).toEqual(['created']);
      if (completion === 'reject') {
        expect(logError).toHaveBeenCalledExactlyOnceWith(error);
      } else {
        expect(logError).not.toHaveBeenCalled();
      }
    },
  );

  it('keeps completion state separate for concurrent requests', async () => {
    const callbacks = new Map<string, () => void>();
    adapter.setOnRequestHook((req, _res, done) => {
      callbacks.set(req.path, done);
      if (callbacks.size === 3) {
        callbacks.get('/b')!();
        callbacks.get('/a')!();
        callbacks.get('/c')!();
      }
    });

    const responses = await Promise.all(
      ['a', 'b', 'c'].map(id =>
        request(app.getHttpServer()).post(`/${id}`).timeout(2000),
      ),
    );

    expect(responses.map(response => response.status)).toEqual([201, 201, 201]);
    expect(responses.map(response => response.body.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(createdIds.toSorted()).toEqual(['a', 'b', 'c']);
  });

  it.each([new Error('After response'), undefined])(
    'logs a request hook rejection after the response without ending it again (%s)',
    async error => {
      let rejectHook!: (reason?: unknown) => void;
      const pendingHook = new Promise<void>((_resolve, reject) => {
        rejectHook = reject;
      });
      const logError = vi
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});
      adapter.setOnRequestHook((_req, _res, done) => {
        done();
        return pendingHook;
      });

      await request(app.getHttpServer())
        .post('/completed')
        .timeout(2000)
        .expect(201, { id: 'completed' });
      expect(logError).not.toHaveBeenCalled();

      const endResponse = vi.spyOn(adapter, 'end');
      rejectHook(error);
      await new Promise(resolve => setImmediate(resolve));

      expect(endResponse).not.toHaveBeenCalled();
      expect(createdIds).toEqual(['completed']);
      expect(logError).toHaveBeenCalledExactlyOnceWith(
        error ?? new Error('Rejected promise'),
      );
    },
  );
});
