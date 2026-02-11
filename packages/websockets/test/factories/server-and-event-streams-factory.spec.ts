import { ReplaySubject, Subject } from 'rxjs';
import { ServerAndEventStreamsFactory } from '../../factories/server-and-event-streams-factory.js';

describe('ServerAndEventStreamsFactory', () => {
  describe('create', () => {
    it(`should return expected observable socket object`, () => {
      const server = { test: 'test' };
      const result = ServerAndEventStreamsFactory.create(server);

      expect(result).to.have.keys('init', 'connection', 'disconnect', 'server');
      expect(result.init instanceof ReplaySubject).toBe(true);
      expect(result.connection instanceof Subject).toBe(true);
      expect(result.disconnect instanceof Subject).toBe(true);
      expect(result.server).toEqual(server);
    });
  });
});
