import { expect } from 'chai';
import { NatsContext } from '../../ctx-host';

describe('NatsContext', () => {
  const args: [string, any] = ['test', {}];
  let context: NatsContext;

  beforeEach(() => {
    context = new NatsContext(args);
  });
  describe('getSubject', () => {
    it('should return subject', () => {
      expect(context.getSubject()).to.be.eql(args[0]);
    });
  });
  describe('getHeaders', () => {
    it('should return headers', () => {
      expect(context.getHeaders()).to.be.eql(args[1]);
    });
  });
});
