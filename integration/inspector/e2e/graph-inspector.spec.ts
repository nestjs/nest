import { ValidationPipe } from '@nestjs/common';
import { Injector } from '@nestjs/core/injector/injector';
import { SerializedGraph } from '@nestjs/core/inspector/serialized-graph';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';
import { expect } from 'chai';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as sinon from 'sinon';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TimeoutInterceptor } from '../src/common/interceptors/timeout.interceptor';

describe('Graph inspector', () => {
  let testingModule: TestingModule;

  before(async () => {
    sinon.stub(Injector.prototype as any, 'getNowTimestamp').callsFake(() => 0);

    testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile({ snapshot: true });
  });

  it('should generate a pre-initialization graph and match snapshot', () => {
    const graph = testingModule.get(SerializedGraph);

    // Update snapshot:
    // writeFileSync(
    //   join(__dirname, 'fixtures', 'pre-init-graph.json'),
    //   graph.toString(),
    // );

    const snapshot = readFileSync(
      join(__dirname, 'fixtures', 'pre-init-graph.json'),
      'utf-8',
    );

    expect(JSON.parse(graph.toString())).to.deep.equal(JSON.parse(snapshot));
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
    //   join(__dirname, 'fixtures', 'post-init-graph.json'),
    //   graph.toString(),
    // );

    const snapshot = readFileSync(
      join(__dirname, 'fixtures', 'post-init-graph.json'),
      'utf-8',
    );

    expect(graph.toString()).to.equal(snapshot);
  });
});
