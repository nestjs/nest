import * as sinon from 'sinon';
import { expect } from 'chai';
import { SocketsContainer } from '../container';

describe('SocketsContainer', () => {
  const namespace = 'test';
  const port = 30;

  let instance: SocketsContainer;
  let getSpy: sinon.SinonSpy, setSpy: sinon.SinonSpy;

  beforeEach(() => {
    setSpy = sinon.spy();
    getSpy = sinon.spy();
    instance = new SocketsContainer();
    (<any>instance)['observableServers'] = {
      get: getSpy,
      set: setSpy,
    };
  });
  describe('getSocketServer', () => {
    it(`should call "observableServers" get method with expected arguments`, () => {
      instance.getServerByPort(port);
      expect(getSpy.calledWith({ namespace, port }));
    });
  });
  describe('storeObservableServer', () => {
    it(`should call "observableServers" set method with expected arguments`, () => {
      const server = {};
      instance.addServer(namespace, port, <any>server);
      expect(setSpy.calledWith({ namespace, port }, server));
    });
  });
  describe('getAllServers', () => {
    it('should return "observableServers"', () => {
      const collection = ['test'];
      (instance as any).observableServers = collection;
      expect(instance.getAllServers()).to.be.eq(collection);
    });
  });
  describe('clear', () => {
    it('should clear servers collection', () => {
      const collection = { clear: sinon.spy() };
      (instance as any).observableServers = collection;
      instance.clear();
      expect(collection.clear.called).to.be.true;
    });
  })
});
