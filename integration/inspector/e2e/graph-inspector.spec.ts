import { ValidationPipe } from '@nestjs/common';
import { Injector } from '@nestjs/core/injector/injector.js';
import { SerializedGraph } from '@nestjs/core/inspector/serialized-graph.js';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { AppModule } from '../src/app.module.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { TimeoutInterceptor } from '../src/common/interceptors/timeout.interceptor.js';

describe('Graph inspector', () => {
  let testingModule: TestingModule;

  beforeAll(async () => {
    vi.spyOn(Injector.prototype as any, 'getNowTimestamp').mockImplementation(
      () => 0,
    );

    testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile({ snapshot: true });
  });

  it('should generate a pre-initialization graph and match snapshot', () => {
    const graph = testingModule.get(SerializedGraph);

    // Update snapshot:
    // writeFileSync(
    //   join(import.meta.dirname, 'fixtures', 'pre-init-graph.json'),
    //   graph.toString(),
    // );

    const snapshot = readFileSync(
      join(import.meta.dirname, 'fixtures', 'pre-init-graph.json'),
      'utf-8',
    );

    expect(JSON.parse(graph.toString())).toEqual(JSON.parse(snapshot));
  });

  it('should generate a post-initialization graph and match snapshot', async () => {
    const app = testingModule.createNestApplication({ preview: true });
    app.useGlobalPipes(new ValidationPipe());
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TimeoutInterceptor());
    app.enableVersioning();
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.TCP,
      options: {},
    });
    await app.init();

    const graph = testingModule.get(SerializedGraph);

    // Update snapshot:
    // writeFileSync(
    //   join(import.meta.dirname, 'fixtures', 'post-init-graph.json'),
    //   graph.toString(),
    // );

    const snapshot = readFileSync(
      join(import.meta.dirname, 'fixtures', 'post-init-graph.json'),
      'utf-8',
    );

    expect(graph.toString()).toBe(snapshot);
  });
});
