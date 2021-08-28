import { ReplaySubject, Subject } from 'rxjs';
import { ServerAndEventStreamsFactory } from '../../factories/server-and-event-streams-factory';

describe('ServerAndEventStreamsFactory', () => {
  describe('create', () => {
    it(`should return expected observable socket object`, () => {
      const server = { test: 'test' };
      const result = ServerAndEventStreamsFactory.create(server);

      expect(Object.keys(result)).toEqual(expect.arrayContaining(['init', 'connection', 'disconnect', 'server']));
      expect(result.init instanceof ReplaySubject).toBeTruthy();
      expect(result.connection instanceof Subject).toBeTruthy();
      expect(result.disconnect instanceof Subject).toBeTruthy();
      expect(result.server).toEqual(server);
    });
  });
});
