import { expect } from 'chai';
import { StanContext } from '../../ctx-host';

describe('StanContext', () => {
  const args: [string, Record<string, any>] = ['test', {}];
  let context: StanContext;

  beforeEach(() => {
    context = new StanContext(args);
  });
  describe('getSubject', () => {
    it('should return subject', () => {
      expect(context.getSubject()).to.be.eql(args[0]);
    });
  });

  describe('getMessage', () => {
    it('should return message', () => {
      expect(context.getMessage()).to.be.eql(args[1]);
    });
  });
});
