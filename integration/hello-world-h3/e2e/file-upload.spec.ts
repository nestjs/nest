import { H3Adapter, NestH3Application } from '@nestjs/platform-h3';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { App } from 'supertest/types';
import { UploadModule } from '../src/upload/upload.module';

describe('File Upload (H3 adapter)', () => {
  let server: App;
  let app: NestH3Application;
  const uploadDir = path.join(os.tmpdir(), 'h3-upload-test');

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

  // =====================================================
  // FORM FIELD PARSING TESTS
  // =====================================================

  describe('Form field parsing', () => {
    it('should extract form fields with @UploadedFields decorator', async () => {
      const response = await request(server)
        .post('/upload/with-form-fields')
        .attach('file', Buffer.from('File content'), 'test.txt')
        .field('username', 'john_doe')
        .field('email', 'john@example.com')
        .expect(201);

      expect(response.body.file).to.deep.include({
        fieldname: 'file',
        originalname: 'test.txt',
      });
      expect(response.body.fields).to.have.lengthOf(2);
      expect(response.body.fields).to.deep.include.members([
        { fieldname: 'username', value: 'john_doe' },
        { fieldname: 'email', value: 'john@example.com' },
      ]);
    });

    it('should extract form fields as object with @FormBody decorator', async () => {
      const response = await request(server)
        .post('/upload/form-body')
        .attach('file', Buffer.from('File content'), 'test.txt')
        .field('username', 'jane_doe')
        .field('age', '25')
        .expect(201);

      expect(response.body.body).to.deep.equal({
        username: 'jane_doe',
        age: '25',
      });
    });

    it('should extract individual form fields with @FormField decorator', async () => {
      const response = await request(server)
        .post('/upload/form-field')
        .attach('file', Buffer.from('File content'), 'test.txt')
        .field('username', 'alice')
        .field('email', 'alice@example.com')
        .expect(201);

      expect(response.body.username).to.equal('alice');
      expect(response.body.email).to.equal('alice@example.com');
    });

    it('should handle missing form fields gracefully', async () => {
      const response = await request(server)
        .post('/upload/form-field')
        .attach('file', Buffer.from('File content'), 'test.txt')
        .expect(201);

      expect(response.body.username).to.be.undefined;
      expect(response.body.email).to.be.undefined;
    });

    it('should parse form fields without file using NoFilesInterceptor', async () => {
      const response = await request(server)
        .post('/upload/no-files')
        .field('name', 'Test User')
        .field('description', 'A test description')
        .expect(201);

      expect(response.body.fields).to.have.lengthOf(2);
      expect(response.body.fields).to.deep.include.members([
        { fieldname: 'name', value: 'Test User' },
        { fieldname: 'description', value: 'A test description' },
      ]);
    });
  });

  // =====================================================
  // DISK STORAGE TESTS
  // =====================================================

  describe('Disk storage', () => {
    it('should upload file to disk with custom filename', async () => {
      const response = await request(server)
        .post('/upload/disk-storage')
        .attach('file', Buffer.from('Disk content'), 'diskfile.txt')
        .expect(201);

      expect(response.body.fieldname).to.equal('file');
      expect(response.body.originalname).to.equal('diskfile.txt');
      expect(response.body.size).to.equal(12);
      expect(response.body.hasPath).to.be.true;
      expect(response.body.destination).to.equal(uploadDir);
      expect(response.body.filename).to.include('diskfile.txt');

      // Verify file exists on disk
      const filePath = response.body.path;
      expect(fs.existsSync(filePath)).to.be.true;

      // Clean up
      fs.unlinkSync(filePath);
    });

    it('should upload multiple files to disk', async () => {
      const response = await request(server)
        .post('/upload/disk-storage-multiple')
        .attach('files', Buffer.from('File A'), 'a.txt')
        .attach('files', Buffer.from('File B'), 'b.txt')
        .expect(201);

      expect(response.body.count).to.equal(2);
      expect(response.body.files).to.have.lengthOf(2);

      for (const file of response.body.files) {
        expect(file.hasPath).to.be.true;
        expect(file.destination).to.equal(uploadDir);
        expect(fs.existsSync(file.path)).to.be.true;

        // Clean up
        fs.unlinkSync(file.path);
      }
    });

    it('should upload files from any field to disk', async () => {
      const response = await request(server)
        .post('/upload/disk-storage-any')
        .attach('image', Buffer.from('Image data'), 'image.png')
        .attach('document', Buffer.from('Doc data'), 'doc.pdf')
        .expect(201);

      expect(response.body.count).to.equal(2);

      for (const file of response.body.files) {
        expect(file.hasPath).to.be.true;
        expect(fs.existsSync(file.path)).to.be.true;

        // Clean up
        fs.unlinkSync(file.path);
      }
    });

    it('should use dest shorthand for disk storage', async () => {
      const response = await request(server)
        .post('/upload/dest-shorthand')
        .attach('file', Buffer.from('Dest test'), 'destfile.txt')
        .expect(201);

      expect(response.body.hasPath).to.be.true;
      expect(response.body.destination).to.equal(uploadDir);

      // Clean up - find file in upload dir with random name
      const files = fs.readdirSync(uploadDir);
      for (const file of files) {
        if (file.includes('destfile.txt') || file.length === 32) {
          try {
            fs.unlinkSync(path.join(uploadDir, file));
          } catch {
            // ignore
          }
        }
      }
    });
  });

  // =====================================================
  // STREAM PROCESSING WITH FORM FIELDS
  // =====================================================

  describe('Stream processing with form fields', () => {
    it('should extract both file and form fields using stream interceptor', async () => {
      const response = await request(server)
        .post('/upload/stream-with-fields')
        .attach('file', Buffer.from('Stream content'), 'stream.txt')
        .field('title', 'My Upload')
        .field('category', 'documents')
        .expect(201);

      expect(response.body.file).to.deep.include({
        fieldname: 'file',
        originalname: 'stream.txt',
        hasPath: true,
      });
      expect(response.body.fields).to.have.lengthOf(2);
      expect(response.body.fields).to.deep.include.members([
        { fieldname: 'title', value: 'My Upload' },
        { fieldname: 'category', value: 'documents' },
      ]);

      // Clean up uploaded file
      const uploadedFiles = fs.readdirSync(uploadDir);
      for (const file of uploadedFiles) {
        try {
          fs.unlinkSync(path.join(uploadDir, file));
        } catch {
          // ignore
        }
      }
    });

    it('should handle form fields only without file in stream mode', async () => {
      const response = await request(server)
        .post('/upload/stream-with-fields')
        .field('metadata', 'some metadata')
        .expect(201);

      expect(response.body.file).to.be.null;
      expect(response.body.fields).to.have.lengthOf(1);
      expect(response.body.fields[0]).to.deep.equal({
        fieldname: 'metadata',
        value: 'some metadata',
      });
    });
  });
});
