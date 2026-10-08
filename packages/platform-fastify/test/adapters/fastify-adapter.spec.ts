import { expect } from 'chai';
import { FastifyRequest } from 'fastify';
import * as sinon from 'sinon';
import { FastifyAdapter } from '../../adapters/fastify-adapter';

describe('FastifyAdapter', () => {
  let fastifyAdapter: FastifyAdapter;

  beforeEach(() => {
    fastifyAdapter = new FastifyAdapter();
  });

  afterEach(() => sinon.restore());

  describe('empty route parameters', () => {
    beforeEach(() => {
      fastifyAdapter.setNotFoundHandler((_req, reply) =>
        reply.code(404).send('not found'),
      );
    });

    afterEach(async () => {
      await fastifyAdapter.close();
    });

    for (const [path, url] of [
      ['/users/:id/profile', '/users//profile'],
      ['/users/:id', '/users/'],
      ['/ranges/:from-:to', '/ranges/-b'],
      ['/ranges/:from-:to', '/ranges/a-'],
    ]) {
      it(`should pass a request for "${path}" with an empty parameter (${url}) to the not-found handler`, async () => {
        const handler = sinon.spy(() => 'found');
        fastifyAdapter.get(path, handler);

        const res = await fastifyAdapter.inject({ method: 'GET', url });

        expect(res.statusCode).to.equal(404);
        expect(res.body).to.equal('not found');
        expect(handler.called).to.be.false;
      });
    }

    it('should call the handler when every route parameter has a value', async () => {
      const handler = sinon.spy((req: FastifyRequest) => req.params);
      fastifyAdapter.get('/ranges/:from-:to', handler);

      const res = await fastifyAdapter.inject({
        method: 'GET',
        url: '/ranges/a-b',
      });

      expect(res.statusCode).to.equal(200);
      expect(JSON.parse(res.body)).to.deep.equal({ from: 'a', to: 'b' });
      expect(handler.calledOnce).to.be.true;
    });

    it('should call the handler for an empty wildcard', async () => {
      const handler = sinon.spy(() => 'found');
      fastifyAdapter.get('/files/*', handler);

      const res = await fastifyAdapter.inject({
        method: 'GET',
        url: '/files/',
      });

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.equal('found');
    });

    it('should pass a request with an empty parameter to the not-found handler for routes registered with all()', async () => {
      const handler = sinon.spy(() => 'found');
      fastifyAdapter.all('/actions/:id/run', handler);

      for (const method of ['GET', 'POST'] as const) {
        const res = await fastifyAdapter.inject({
          method,
          url: '/actions//run',
        });
        expect(res.statusCode).to.equal(404);
      }
      expect(handler.called).to.be.false;

      const res = await fastifyAdapter.inject({
        method: 'POST',
        url: '/actions/1/run',
      });
      expect(res.body).to.equal('found');
    });

    it('should keep the name of the route handler', () => {
      const names: string[] = [];
      fastifyAdapter.getInstance().addHook('onRoute', route => {
        names.push(route.handler.name);
      });
      const handler = () => 'found';
      Object.defineProperty(handler, 'name', {
        value: 'UsersController.findOne',
      });

      fastifyAdapter.get('/users/:id', handler);

      expect(names).to.deep.equal([
        'UsersController.findOne',
        'UsersController.findOne',
      ]);
    });
  });
});
