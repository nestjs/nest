import { INestApplication, NestApplicationOptions, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { FileNameController } from '../src/path-syntax/file-name.controller.js';
import { MixedSegmentController } from '../src/path-syntax/mixed-segment.controller.js';
import { OptionalGroupController } from '../src/path-syntax/optional-group.controller.js';
import { listenOnLoopback } from '../../_support/listen-on-loopback.js';

async function startApp(
  controller: Type,
  options: NestApplicationOptions,
  warnings: string[] = [],
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [controller],
  }).compile();
  const app = moduleRef.createNestApplication(options);
  app.useLogger({
    log: () => {},
    warn: (message: unknown) => warnings.push(String(message)),
    error: () => {},
  });
  await listenOnLoopback(app);
  return app;
}

describe('Route conflicts in path-to-regexp syntax (Express)', () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  describe('a route with an optional group declared first', () => {
    it('serves the requests of the route after it', async () => {
      app = await startApp(OptionalGroupController, {});

      const response = await request(app.getHttpServer()).get('/users/5');
      expect(response.body).toEqual({ handler: 'find', userId: '5' });
    });

    it('is reported as shadowing that route', async () => {
      const warnings: string[] = [];
      app = await startApp(
        OptionalGroupController,
        { routeConflictPolicy: { shadow: 'warn' } },
        warnings,
      );

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('/users/:userId');
      expect(warnings[0]).toContain('/users{/:userId}');
    });
  });

  describe('a segment mixing text and a param declared first', () => {
    it('serves the requests of a literal route after it', async () => {
      app = await startApp(MixedSegmentController, {});

      const response = await request(app.getHttpServer()).get('/releases/v1');
      expect(response.body).toEqual({ handler: 'byVersion', version: '1' });
    });

    it('is reported as shadowing that route', async () => {
      const warnings: string[] = [];
      app = await startApp(
        MixedSegmentController,
        { routeConflictPolicy: { shadow: 'warn' } },
        warnings,
      );

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('/releases/v1');
      expect(warnings[0]).toContain('/releases/v:version');
    });

    it('is registered after that route with the specificity strategy', async () => {
      app = await startApp(MixedSegmentController, {
        routeResolutionStrategy: 'specificity',
      });

      const literal = await request(app.getHttpServer()).get('/releases/v1');
      expect(literal.body).toEqual({ handler: 'v1' });

      const mixed = await request(app.getHttpServer()).get('/releases/v2');
      expect(mixed.body).toEqual({ handler: 'byVersion', version: '2' });
    });
  });

  describe('a segment mixing params that a literal route cannot match', () => {
    it('lets the application start with shadow=error', async () => {
      app = await startApp(FileNameController, {
        routeConflictPolicy: { shadow: 'error' },
      });

      const literal = await request(app.getHttpServer()).get('/files/readme');
      expect(literal.body).toEqual({ handler: 'readme' });

      const mixed = await request(app.getHttpServer()).get('/files/notes.txt');
      expect(mixed.body).toEqual({
        handler: 'byName',
        name: 'notes',
        ext: 'txt',
      });
    });
  });
});
