import { H3Adapter, NestH3Application } from '@nestjs/platform-h3';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { UploadModule } from '../src/upload/upload.module';

describe('File Upload (H3 adapter)', () => {
  let server: App;
  let app: NestH3Application;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [UploadModule],
    }).compile();

    app = module.createNestApplication<NestH3Application>(new H3Adapter());
    server = app.getHttpServer();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Single file upload', () => {
    it('should upload a single file successfully', async () => {
      const response = await request(server)
        .post('/upload/single')
        .attach('file', Buffer.from('Hello, World!'), 'test.txt')
        .expect(201);

      expect(response.body).to.deep.include({
        fieldname: 'file',
        originalname: 'test.txt',
        mimetype: 'text/plain',
        size: 13,
        content: 'Hello, World!',
      });
    });

    it('should handle missing file gracefully', async () => {
      const response = await request(server)
        .post('/upload/single')
        .send({})
        .expect(201);

      expect(response.body).to.deep.equal({ message: 'No file uploaded' });
    });
  });

  describe('Multiple files upload', () => {
    it('should upload multiple files from same field', async () => {
      const response = await request(server)
        .post('/upload/multiple')
        .attach('files', Buffer.from('File 1'), 'file1.txt')
        .attach('files', Buffer.from('File 2'), 'file2.txt')
        .expect(201);

      expect(response.body.count).to.equal(2);
      expect(response.body.files).to.have.lengthOf(2);
      expect(response.body.files[0]).to.deep.include({
        fieldname: 'files',
        originalname: 'file1.txt',
        content: 'File 1',
      });
      expect(response.body.files[1]).to.deep.include({
        fieldname: 'files',
        originalname: 'file2.txt',
        content: 'File 2',
      });
    });

    it('should handle no files uploaded', async () => {
      const response = await request(server)
        .post('/upload/multiple')
        .send({})
        .expect(201);

      expect(response.body).to.deep.equal({
        message: 'No files uploaded',
        count: 0,
      });
    });
  });

  describe('File fields upload', () => {
    it('should upload files from multiple fields', async () => {
      const response = await request(server)
        .post('/upload/fields')
        .attach('avatar', Buffer.from('Avatar content'), 'avatar.png')
        .attach('documents', Buffer.from('Doc 1'), 'doc1.pdf')
        .attach('documents', Buffer.from('Doc 2'), 'doc2.pdf')
        .expect(201);

      expect(response.body.avatar).to.have.lengthOf(1);
      expect(response.body.avatar[0]).to.deep.include({
        fieldname: 'avatar',
        originalname: 'avatar.png',
        content: 'Avatar content',
      });

      expect(response.body.documents).to.have.lengthOf(2);
      expect(response.body.documents[0]).to.deep.include({
        fieldname: 'documents',
        originalname: 'doc1.pdf',
        content: 'Doc 1',
      });
      expect(response.body.documents[1]).to.deep.include({
        fieldname: 'documents',
        originalname: 'doc2.pdf',
        content: 'Doc 2',
      });
    });
  });

  describe('Any files upload', () => {
    it('should accept files from any field', async () => {
      const response = await request(server)
        .post('/upload/any')
        .attach('file1', Buffer.from('Content 1'), 'a.txt')
        .attach('file2', Buffer.from('Content 2'), 'b.txt')
        .attach('anotherField', Buffer.from('Content 3'), 'c.txt')
        .expect(201);

      expect(response.body.count).to.equal(3);
      expect(response.body.files).to.have.lengthOf(3);
    });
  });

  describe('File size limits', () => {
    it('should reject files exceeding size limit', async () => {
      // Create a buffer larger than 100 bytes
      const largeContent = 'x'.repeat(200);

      const response = await request(server)
        .post('/upload/with-limits')
        .attach('file', Buffer.from(largeContent), 'large.txt')
        .expect(413);

      expect(response.body.message).to.include('File too large');
    });

    it('should accept files within size limit', async () => {
      const smallContent = 'small';

      const response = await request(server)
        .post('/upload/with-limits')
        .attach('file', Buffer.from(smallContent), 'small.txt')
        .expect(201);

      expect(response.body).to.deep.include({
        fieldname: 'file',
        originalname: 'small.txt',
        size: 5,
      });
    });
  });
});
