import { expect } from 'chai';

import { RedisContext } from '../../ctx-host';

describe('RedisContext', () => {
  const args = ['test'];
  let context: RedisContext;

  beforeEach(() => {
    context = new RedisContext(args as [string]);
  });
  describe('getChannel', () => {
    it('should return original channel', () => {
      expect(context.getChannel()).to.be.eql(args[0]);
    });
  });
});
