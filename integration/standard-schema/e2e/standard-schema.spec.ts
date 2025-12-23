import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as request from 'supertest';
import { StandardSchemaValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';

describe('StandardSchemaValidationPipe with Zod (e2e)', () => {
  let app: INestApplication;
  let server: any;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new StandardSchemaValidationPipe());
    server = app.getHttpServer();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /users', () => {
    it('should create user with valid data', () => {
      return request(server)
        .post('/users')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          age: 30,
        })
        .expect(201)
        .expect(res => {
          expect(res.body.success).to.equal(true);
          expect(res.body.data.name).to.equal('John Doe');
          expect(res.body.data.email).to.equal('john@example.com');
          expect(res.body.data.age).to.equal(30);
        });
    });

    it('should create user without optional age', () => {
      return request(server)
        .post('/users')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
        })
        .expect(201)
        .expect(res => {
          expect(res.body.success).to.equal(true);
          expect(res.body.data.name).to.equal('Jane Doe');
          expect(res.body.data.email).to.equal('jane@example.com');
        });
    });

    it('should reject invalid email', () => {
      return request(server)
        .post('/users')
        .send({
          name: 'John Doe',
          email: 'invalid-email',
        })
        .expect(400)
        .expect(res => {
          expect(res.body.message).to.be.an('array');
          expect(res.body.message.some((m: string) => m.includes('email'))).to
            .be.true;
        });
    });

    it('should reject name that is too short', () => {
      return request(server)
        .post('/users')
        .send({
          name: 'J',
          email: 'john@example.com',
        })
        .expect(400)
        .expect(res => {
          expect(res.body.message).to.be.an('array');
          expect(res.body.message.some((m: string) => m.includes('Name'))).to.be
            .true;
        });
    });

    it('should reject missing required fields', () => {
      return request(server)
        .post('/users')
        .send({})
        .expect(400)
        .expect(res => {
          expect(res.body.message).to.be.an('array');
        });
    });

    it('should reject invalid age type', () => {
      return request(server)
        .post('/users')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          age: 'thirty',
        })
        .expect(400);
    });

    it('should reject age out of range', () => {
      return request(server)
        .post('/users')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          age: 200,
        })
        .expect(400);
    });
  });

  describe('POST /users/query', () => {
    it('should handle valid query params with body', () => {
      return request(server)
        .post('/users/query?limit=10&offset=5')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
        })
        .expect(201)
        .expect(res => {
          expect(res.body.success).to.equal(true);
          expect(res.body.query.limit).to.equal(10);
          expect(res.body.query.offset).to.equal(5);
          expect(res.body.body.name).to.equal('John Doe');
        });
    });
  });
});

describe('StandardSchemaValidationPipe with disableErrorMessages (e2e)', () => {
  let app: INestApplication;
  let server: any;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new StandardSchemaValidationPipe({
        disableErrorMessages: true,
      }),
    );
    server = app.getHttpServer();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should not include error details when disabled', () => {
    return request(server)
      .post('/users')
      .send({
        name: 'J',
        email: 'invalid',
      })
      .expect(400)
      .expect(res => {
        expect(res.body.message).to.equal('Bad Request');
      });
  });
});

describe('StandardSchemaValidationPipe with custom errorHttpStatusCode (e2e)', () => {
  let app: INestApplication;
  let server: any;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new StandardSchemaValidationPipe({
        errorHttpStatusCode: 422,
      }),
    );
    server = app.getHttpServer();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should return custom status code on validation error', () => {
    return request(server)
      .post('/users')
      .send({
        name: 'J',
        email: 'invalid',
      })
      .expect(422);
  });
});
