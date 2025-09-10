import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { existsSync } from 'fs';
import { join } from 'path';

describe('GraphQL Federation Gateway (Code First)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Ensure supergraph.graphql exists
    const supergraphPath = join(__dirname, '..', 'supergraph.graphql');
    if (!existsSync(supergraphPath)) {
      // Generate a default supergraph for testing
      require('../generate-supergraph');
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
    const fs = require('fs');
    const appModuleContent = fs.readFileSync(appModulePath, 'utf-8');

    // Check that IntrospectAndCompose is commented out or not used
    const hasActiveIntrospect =
      appModuleContent.includes('new IntrospectAndCompose') &&
      !appModuleContent.includes('// supergraphSdl: new IntrospectAndCompose');

    expect(hasActiveIntrospect).toBe(false);
  });

  it('should read supergraph from file system', () => {
    const appModulePath = join(__dirname, '..', 'src', 'app.module.ts');
    const fs = require('fs');
    const appModuleContent = fs.readFileSync(appModulePath, 'utf-8');

    // Check that the module reads from a file
    expect(appModuleContent).toContain('readFileSync');
    expect(appModuleContent).toContain('supergraph.graphql');
  });
});
