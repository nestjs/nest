import { expect } from 'chai';
import { ReplaySubject, Subject } from 'rxjs';
import { SocketEventsHostFactory } from '../socket-events-host-factory';

describe('SocketEventsHostFactory', () => {
  describe('create', () => {
    it(`should return expected observable socket object`, () => {
      const server = { test: 'test' };
      const result = SocketEventsHostFactory.create(server);

      expect(result).to.have.keys('init', 'connection', 'disconnect', 'server');
      expect(result.init instanceof ReplaySubject).to.be.true;
      expect(result.connection instanceof Subject).to.be.true;
      expect(result.disconnect instanceof Subject).to.be.true;
      expect(result.server).to.be.eql(server);
    });
  });
});
