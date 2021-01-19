import { expect } from 'chai';
import { GCPubSubContext } from '../../ctx-host';

describe('GCPubSubContext', () => {
  const args = [{}, 'pattern'];
  let context: GCPubSubContext;

  beforeEach(() => {
    context = new GCPubSubContext(args as any);
  });
  describe('getSubject', () => {
    it('should return subject', () => {
      expect(context.getMessage()).to.be.eql(args[0]);
    });
  });
  describe('getPattern', () => {
    it('should return pattern', () => {
      expect(context.getPattern()).to.be.eql(args[1]);
    });
  });
});
