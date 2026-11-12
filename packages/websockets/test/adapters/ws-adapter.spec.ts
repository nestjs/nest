import { expect } from 'chai';
import * as sinon from 'sinon';
import { AbstractWsAdapter } from '../../adapters/ws-adapter';

class TestAdapter extends AbstractWsAdapter {
  public create() {}
  public bindMessageHandlers() {}
}

describe('AbstractWsAdapter', () => {
  let adapter: TestAdapter;

  beforeEach(() => {
    adapter = new TestAdapter();
  });

  describe('closeClient', () => {
    it('should terminate a client that can be terminated (ws)', () => {
      const client = {
        on: sinon.spy(),
        close: sinon.spy(),
        terminate: sinon.spy(),
      };

      adapter.closeClient(client);
      expect(client.terminate.calledOnce).to.be.true;
      expect(client.close.called).to.be.false;
    });

    it('should close the underlying connection of a client that has one (socket.io)', () => {
      const client = {
        on: sinon.spy(),
        close: sinon.spy(),
        disconnect: sinon.spy(),
        conn: { close: sinon.spy() },
      };

      adapter.closeClient(client);
      expect(client.conn.close.calledOnce).to.be.true;
      expect(client.disconnect.called).to.be.false;
      expect(client.close.called).to.be.false;
    });

    it('should close any other client', () => {
      const client = { on: sinon.spy(), close: sinon.spy() };

      adapter.closeClient(client);
      expect(client.close.calledOnce).to.be.true;
    });

    it('should leave a client that cannot be closed', () => {
      expect(() => adapter.closeClient({} as any)).not.to.throw();
    });
  });
});
