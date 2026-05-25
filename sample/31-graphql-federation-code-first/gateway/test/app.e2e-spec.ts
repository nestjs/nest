import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('GraphQL Federation Gateway (Code First)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const supergraphPath = join(__dirname, '..', 'supergraph.graphql');
    if (!existsSync(supergraphPath)) {
      await import('../generate-supergraph.js');
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should load gateway with static supergraph', () => {
    return request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          query {
            _service {
              sdl
            }
          }
        `,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.data).toBeDefined();
        expect(res.body.data._service).toBeDefined();
        expect(res.body.data._service.sdl).toContain('type User');
        expect(res.body.data._service.sdl).toContain('type Post');
      });
  });

  it('should not use IntrospectAndCompose in production', () => {
    const appModulePath = join(__dirname, '..', 'src', 'app.module.ts');
    const appModuleContent = readFileSync(appModulePath, 'utf-8');

    const hasActiveIntrospect =
      appModuleContent.includes('new IntrospectAndCompose') &&
      !appModuleContent.includes('// supergraphSdl: new IntrospectAndCompose');

    expect(hasActiveIntrospect).toBe(false);
  });

  it('should read supergraph from file system', () => {
    const appModulePath = join(__dirname, '..', 'src', 'app.module.ts');
    const appModuleContent = readFileSync(appModulePath, 'utf-8');

    expect(appModuleContent).toContain('readFileSync');
    expect(appModuleContent).toContain('supergraph.graphql');
  });
});
