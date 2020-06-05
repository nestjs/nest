import { expect } from 'chai';
import { NatsContext } from '../../ctx-host';

describe('NatsContext', () => {
  const args: [string, string] = ['test', 'test2'];
  let context: NatsContext;

  beforeEach(() => {
    context = new NatsContext(args);
  });
  describe('getSubject', () => {
    it('should return subject', () => {
      expect(context.getSubject()).to.be.eql(args[0]);
    });
  });
  describe('getReplyTo', () => {
    it('should return subject', () => {
      expect(context.getReplyTo()).to.be.eql(args[1]);
    });
  });
});
