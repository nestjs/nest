import { expect } from 'chai';

import { TcpContext } from '../../ctx-host';

describe('TcpContext', () => {
  const args = [{}, 'pattern'];
  let context: TcpContext;

  beforeEach(() => {
    context = new TcpContext(args as any);
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
