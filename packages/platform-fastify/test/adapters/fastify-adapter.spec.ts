import { FastifyAdapter } from '@nestjs/platform-fastify';
import { expect } from 'chai';

describe('FastifyAdapter', () => {
  describe('setViewEngine', () => {
    it('should throw when called with a string argument', () => {
      const adapter = new FastifyAdapter();
      expect(() => adapter.setViewEngine('ejs')).to.throw(
        "setViewEngine() doesn't support a string argument.",
      );
    }).timeout(5000);
  });
});
