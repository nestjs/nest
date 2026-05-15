import {
  ArgumentMetadata,
  Body,
  Controller,
  createParamDecorator,
  ExecutionContext,
  Get,
  INestApplication,
  Injectable,
  Module,
  Param,
  PipeTransform,
  Post,
  Query,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import request from 'supertest';

const testSchema: StandardSchemaV1 = {
  '~standard': {
    version: 1,
    vendor: 'test',
    validate: (value: unknown) => ({ value }),
  },
};

/**
 * A pipe that captures the ArgumentMetadata it receives,
 * so the test can verify that `schema` is propagated.
 */
@Injectable()
class SchemaCaptorPipe implements PipeTransform {
  static lastMetadata: ArgumentMetadata | undefined;

  transform(value: any, metadata: ArgumentMetadata) {
    SchemaCaptorPipe.lastMetadata = metadata;
    return value;
  }
}

const CustomParam = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    return ctx.switchToHttp().getRequest().query;
  },
);

@Controller('schema-test')
class SchemaTestController {
  @Post('body')
  bodyWithSchema(
    @Body({ schema: testSchema, pipes: [SchemaCaptorPipe] }) body: any,
  ) {
    return { received: body };
  }

  @Get('query')
  queryWithSchema(
    @Query({ schema: testSchema, pipes: [SchemaCaptorPipe] }) query: any,
  ) {
    return { received: query };
  }

  @Get('param/:id')
  paramWithSchema(
    @Param('id', { schema: testSchema, pipes: [SchemaCaptorPipe] }) id: string,
  ) {
    return { received: id };
  }

  @Get('custom')
  customWithSchema(
    @CustomParam({ schema: testSchema, pipes: [SchemaCaptorPipe] }) value: any,
  ) {
    return { received: value };
  }

  @Post('body-property')
  bodyPropertyWithSchema(
    @Body('name', { schema: testSchema, pipes: [SchemaCaptorPipe] })
    name: string,
  ) {
    return { received: name };
  }
}

@Module({
  controllers: [SchemaTestController],
  providers: [SchemaCaptorPipe],
})
class SchemaTestModule {}

describe('Schema propagation to pipes', () => {
  let app: INestApplication;
  let server: any;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [SchemaTestModule],
    }).compile();

    app = module.createNestApplication();
    server = app.getHttpServer();
    await app.init();
  });

  beforeEach(() => {
    SchemaCaptorPipe.lastMetadata = undefined;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should pass schema to pipe via @Body(options)', async () => {
    await request(server)
      .post('/schema-test/body')
      .send({ name: 'test' })
      .expect(201);

    expect(SchemaCaptorPipe.lastMetadata).toBeDefined();
    expect(SchemaCaptorPipe.lastMetadata!.schema).toBe(testSchema);
    expect(SchemaCaptorPipe.lastMetadata!.type).toBe('body');
  });

  it('should pass schema to pipe via @Query(options)', async () => {
    await request(server).get('/schema-test/query?user=john').expect(200);

    expect(SchemaCaptorPipe.lastMetadata).toBeDefined();
    expect(SchemaCaptorPipe.lastMetadata!.schema).toBe(testSchema);
    expect(SchemaCaptorPipe.lastMetadata!.type).toBe('query');
  });

  it('should pass schema to pipe via @Param(property, options)', async () => {
    await request(server)
      .get('/schema-test/param/42')
      .expect(200)
      .expect({ received: '42' });

    expect(SchemaCaptorPipe.lastMetadata).toBeDefined();
    expect(SchemaCaptorPipe.lastMetadata!.schema).toBe(testSchema);
    expect(SchemaCaptorPipe.lastMetadata!.type).toBe('param');
    expect(SchemaCaptorPipe.lastMetadata!.data).toBe('id');
  });

  it('should pass schema to pipe via createParamDecorator(options)', async () => {
    await request(server).get('/schema-test/custom?key=val').expect(200);

    expect(SchemaCaptorPipe.lastMetadata).toBeDefined();
    expect(SchemaCaptorPipe.lastMetadata!.schema).toBe(testSchema);
    expect(SchemaCaptorPipe.lastMetadata!.type).toBe('custom');
  });

  it('should pass schema to pipe via @Body(property, options)', async () => {
    await request(server)
      .post('/schema-test/body-property')
      .send({ name: 'Alice' })
      .expect(201)
      .expect({ received: 'Alice' });

    expect(SchemaCaptorPipe.lastMetadata).toBeDefined();
    expect(SchemaCaptorPipe.lastMetadata!.schema).toBe(testSchema);
    expect(SchemaCaptorPipe.lastMetadata!.type).toBe('body');
    expect(SchemaCaptorPipe.lastMetadata!.data).toBe('name');
  });
});
