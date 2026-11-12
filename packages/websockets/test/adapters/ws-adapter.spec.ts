import { AbstractWsAdapter } from '../../adapters/ws-adapter.js';

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
      const client = { on: vi.fn(), close: vi.fn(), terminate: vi.fn() };

      adapter.closeClient(client);
      expect(client.terminate).toHaveBeenCalledOnce();
      expect(client.close).not.toHaveBeenCalled();
    });

    it('should close the underlying connection of a client that has one (socket.io)', () => {
      const client = {
        on: vi.fn(),
        close: vi.fn(),
        disconnect: vi.fn(),
        conn: { close: vi.fn() },
      };

      adapter.closeClient(client);
      expect(client.conn.close).toHaveBeenCalledOnce();
      expect(client.disconnect).not.toHaveBeenCalled();
      expect(client.close).not.toHaveBeenCalled();
    });

    it('should close any other client', () => {
      const client = { on: vi.fn(), close: vi.fn() };

      adapter.closeClient(client);
      expect(client.close).toHaveBeenCalledOnce();
    });

    it('should leave a client that cannot be closed', () => {
      expect(() => adapter.closeClient({} as any)).not.toThrow();
    });
  });
});
