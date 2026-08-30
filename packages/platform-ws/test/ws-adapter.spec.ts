import { createServer } from 'http';
import { WsAdapter } from '../adapters/ws-adapter.js';

describe('WsAdapter', () => {
  describe('dispose', () => {
    it('should remove the upgrade listener it added to a caller-supplied server', async () => {
      const httpServer = createServer();
      const adapter = new WsAdapter(httpServer);

      adapter.create(0, { path: '/live' });
      expect(httpServer.listenerCount('upgrade')).toBe(1);

      await adapter.dispose();

      expect(httpServer.listenerCount('upgrade')).toBe(0);
    });

    it('should not accumulate upgrade listeners across adapters sharing a server', async () => {
      const httpServer = createServer();

      for (let i = 0; i < 3; i++) {
        const adapter = new WsAdapter(httpServer);
        adapter.create(0, { path: '/live' });
        await adapter.dispose();
      }

      expect(httpServer.listenerCount('upgrade')).toBe(0);
    });
  });
});
