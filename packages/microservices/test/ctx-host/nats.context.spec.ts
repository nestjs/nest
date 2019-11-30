import { expect } from 'chai';
import { NatsContext } from '../../ctx-host';

describe('NatsContext', () => {
  const args: [string] = ['test'];
  let context: NatsContext;

  beforeEach(() => {
    context = new NatsContext(args);
  });
  describe('getSubject', () => {
    it('should return subject', () => {
      expect(context.getSubject()).to.be.eql(args[0]);
    });
  });
});
