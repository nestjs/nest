import { expect } from 'chai';
import { LocalDomainContext } from '../../ctx-host';

describe('LocalDomainContext', () => {
  const args = [{}, 'pattern'];
  let context: LocalDomainContext;

  beforeEach(() => {
    context = new LocalDomainContext(args as any);
  });
  describe('getSubject', () => {
    it('should return subject', () => {
      expect(context.getSocketRef()).to.be.eql(args[0]);
    });
  });
  describe('getPattern', () => {
    it('should return pattern', () => {
      expect(context.getPattern()).to.be.eql(args[1]);
    });
  });
});
