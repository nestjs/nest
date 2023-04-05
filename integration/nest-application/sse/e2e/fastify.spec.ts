import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as EventSource from 'eventsource';
import { AppModule } from '../src/app.module';

describe('Sse (Fastify Application)', () => {
  let app: NestFastifyApplication;
  let eventSource: EventSource;

  describe('without forceCloseConnections', () => {
    beforeEach(async () => {
      const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );

      await app.listen(3000);
      const url = await app.getUrl();

      eventSource = new EventSource(url + '/sse', {
        headers: { connection: 'keep-alive' },
      });
    });

    // The order of actions is very important here. When not using `forceCloseConnections`,
    // the SSe eventsource should close the connections in order to signal the server that
    // the keep-alive connection can be ended.
    afterEach(async () => {
      eventSource.close();

      await app.close();
    });

    it('receives events from server', done => {
      eventSource.addEventListener('message', event => {
        expect(JSON.parse(event.data)).to.eql({
          hello: 'world',
        });
        done();
      });
    });
  });

  describe('with forceCloseConnections', () => {
    beforeEach(async () => {
      const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter({
          forceCloseConnections: true,
        }),
      );

      await app.listen(3000);
      const url = await app.getUrl();

      eventSource = new EventSource(url + '/sse', {
        headers: { connection: 'keep-alive' },
      });
    });

    afterEach(async () => {
      await app.close();

      eventSource.close();
    });

    it('receives events from server', done => {
      eventSource.addEventListener('message', event => {
        expect(JSON.parse(event.data)).to.eql({
          hello: 'world',
        });
        done();
      });
    });
  });
});
