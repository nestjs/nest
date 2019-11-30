import { expect } from 'chai';
import { TcpContext } from '../../ctx-host';

describe('TcpContext', () => {
  const args = [{}];
  let context: TcpContext;

  beforeEach(() => {
    context = new TcpContext(args as any);
  });
  describe('getSubject', () => {
    it('should return subject', () => {
      expect(context.getSocketRef()).to.be.eql(args[0]);
    });
  });
});
