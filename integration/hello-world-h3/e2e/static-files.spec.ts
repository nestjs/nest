import { Test } from '@nestjs/testing';
import { H3Adapter, NestH3Application } from '@nestjs/platform-h3';
import { expect } from 'chai';
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Static Files (H3 adapter)', () => {
  let app: NestH3Application;
  let tempDir: string;

  beforeEach(() => {
    // Create a temporary directory with test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nest-h3-static-'));

    // Create test files
    fs.writeFileSync(
      path.join(tempDir, 'index.html'),
      '<html><body>Hello</body></html>',
    );
    fs.writeFileSync(path.join(tempDir, 'test.txt'), 'Test content');
    fs.writeFileSync(path.join(tempDir, 'style.css'), 'body { color: red; }');
    fs.writeFileSync(path.join(tempDir, '.hidden'), 'Hidden file content');

    // Create a subdirectory
    const subDir = path.join(tempDir, 'sub');
    fs.mkdirSync(subDir);
    fs.writeFileSync(path.join(subDir, 'nested.txt'), 'Nested content');
    fs.writeFileSync(
      path.join(subDir, 'index.html'),
      '<html>Nested index</html>',
    );
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }

    // Clean up temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('basic static file serving', () => {
    beforeEach(async () => {
      const moduleRef = await Test.createTestingModule({}).compile();

      app = moduleRef.createNestApplication<NestH3Application>(new H3Adapter());
      (app.getHttpAdapter() as H3Adapter).useStaticAssets(tempDir);
      await app.init();
    });

    it('should serve index.html at root', () => {
      return request(app.getHttpServer())
        .get('/index.html')
        .expect(200)
        .expect('Content-Type', /html/)
        .expect(/<html><body>Hello<\/body><\/html>/);
    });

    it('should serve text files', () => {
      return request(app.getHttpServer())
        .get('/test.txt')
        .expect(200)
        .expect('Test content');
    });

    it('should serve css files', () => {
      return request(app.getHttpServer())
        .get('/style.css')
        .expect(200)
        .expect('body { color: red; }');
    });

    it('should serve files from subdirectories', () => {
      return request(app.getHttpServer())
        .get('/sub/nested.txt')
        .expect(200)
        .expect('Nested content');
    });

    it('should return 404 for non-existent files', () => {
      return request(app.getHttpServer()).get('/nonexistent.txt').expect(404);
    });
  });

  describe('prefix option', () => {
    beforeEach(async () => {
      const moduleRef = await Test.createTestingModule({}).compile();

      app = moduleRef.createNestApplication<NestH3Application>(new H3Adapter());
      (app.getHttpAdapter() as H3Adapter).useStaticAssets(tempDir, {
        prefix: '/static',
      });
      await app.init();
    });

    it('should serve files with prefix', () => {
      return request(app.getHttpServer())
        .get('/static/test.txt')
        .expect(200)
        .expect('Test content');
    });

    it('should not serve files without prefix', () => {
      return request(app.getHttpServer()).get('/test.txt').expect(404);
    });

    it('should serve nested files with prefix', () => {
      return request(app.getHttpServer())
        .get('/static/sub/nested.txt')
        .expect(200)
        .expect('Nested content');
    });
  });

  describe('dotfiles option', () => {
    it('should ignore dotfiles by default', async () => {
      const moduleRef = await Test.createTestingModule({}).compile();

      app = moduleRef.createNestApplication<NestH3Application>(new H3Adapter());
      (app.getHttpAdapter() as H3Adapter).useStaticAssets(tempDir);
      await app.init();

      // Dotfiles are ignored by default, so it continues to next handler (404)
      return request(app.getHttpServer()).get('/.hidden').expect(404);
    });

    it('should deny dotfiles when dotfiles=deny', async () => {
      const moduleRef = await Test.createTestingModule({}).compile();

      app = moduleRef.createNestApplication<NestH3Application>(new H3Adapter());
      (app.getHttpAdapter() as H3Adapter).useStaticAssets(tempDir, {
        dotfiles: 'deny',
      });
      await app.init();

      return request(app.getHttpServer()).get('/.hidden').expect(403);
    });

    it('should allow dotfiles when dotfiles=allow', async () => {
      const moduleRef = await Test.createTestingModule({}).compile();

      app = moduleRef.createNestApplication<NestH3Application>(new H3Adapter());
      (app.getHttpAdapter() as H3Adapter).useStaticAssets(tempDir, {
        dotfiles: 'allow',
      });
      await app.init();

      return request(app.getHttpServer())
        .get('/.hidden')
        .expect(200)
        .expect('Hidden file content');
    });
  });

  describe('index option', () => {
    it('should serve index.html for directories by default', async () => {
      const moduleRef = await Test.createTestingModule({}).compile();

      app = moduleRef.createNestApplication<NestH3Application>(new H3Adapter());
      (app.getHttpAdapter() as H3Adapter).useStaticAssets(tempDir);
      await app.init();

      return request(app.getHttpServer())
        .get('/sub/')
        .expect(200)
        .expect(/<html>Nested index<\/html>/);
    });

    it('should not serve index when index=false', async () => {
      const moduleRef = await Test.createTestingModule({}).compile();

      app = moduleRef.createNestApplication<NestH3Application>(new H3Adapter());
      (app.getHttpAdapter() as H3Adapter).useStaticAssets(tempDir, {
        index: false,
      });
      await app.init();

      return request(app.getHttpServer()).get('/sub/').expect(404);
    });
  });

  describe('cache control', () => {
    it('should set Cache-Control header with maxAge', async () => {
      const moduleRef = await Test.createTestingModule({}).compile();

      app = moduleRef.createNestApplication<NestH3Application>(new H3Adapter());
      (app.getHttpAdapter() as H3Adapter).useStaticAssets(tempDir, {
        maxAge: 3600000, // 1 hour in ms
      });
      await app.init();

      return request(app.getHttpServer())
        .get('/test.txt')
        .expect(200)
        .expect('Cache-Control', /max-age=3600/);
    });

    it('should set immutable in Cache-Control when enabled', async () => {
      const moduleRef = await Test.createTestingModule({}).compile();

      app = moduleRef.createNestApplication<NestH3Application>(new H3Adapter());
      (app.getHttpAdapter() as H3Adapter).useStaticAssets(tempDir, {
        maxAge: 3600000,
        immutable: true,
      });
      await app.init();

      return request(app.getHttpServer())
        .get('/test.txt')
        .expect(200)
        .expect('Cache-Control', /immutable/);
    });

    it('should parse string maxAge like "1d"', async () => {
      const moduleRef = await Test.createTestingModule({}).compile();

      app = moduleRef.createNestApplication<NestH3Application>(new H3Adapter());
      (app.getHttpAdapter() as H3Adapter).useStaticAssets(tempDir, {
        maxAge: '1d',
      });
      await app.init();

      return request(app.getHttpServer())
        .get('/test.txt')
        .expect(200)
        .expect('Cache-Control', /max-age=86400/);
    });
  });

  describe('security', () => {
    it('should prevent directory traversal attacks', async () => {
      const moduleRef = await Test.createTestingModule({}).compile();

      app = moduleRef.createNestApplication<NestH3Application>(new H3Adapter());
      (app.getHttpAdapter() as H3Adapter).useStaticAssets(tempDir);
      await app.init();

      // Try to access file outside static directory
      return request(app.getHttpServer())
        .get('/../../../etc/passwd')
        .expect(404);
    });

    it('should prevent encoded directory traversal', async () => {
      const moduleRef = await Test.createTestingModule({}).compile();

      app = moduleRef.createNestApplication<NestH3Application>(new H3Adapter());
      (app.getHttpAdapter() as H3Adapter).useStaticAssets(tempDir);
      await app.init();

      // URL-encoded traversal attempt
      return request(app.getHttpServer())
        .get('/%2e%2e/%2e%2e/etc/passwd')
        .expect(404);
    });
  });
});
