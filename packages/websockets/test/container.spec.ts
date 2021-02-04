import { expect } from 'chai';
import * as hash from 'object-hash';
import * as sinon from 'sinon';
import { SocketsContainer } from '../sockets-container';

describe('SocketsContainer', () => {
  const port = 30;

  let instance: SocketsContainer;
  let getSpy: sinon.SinonSpy, setSpy: sinon.SinonSpy;

  beforeEach(() => {
    setSpy = sinon.spy();
    getSpy = sinon.spy();
    instance = new SocketsContainer();
    (instance as any).serverAndEventStreamsHosts = {
      get: getSpy,
      set: setSpy,
    };
  });
  describe('getSocketEventsHostByPort', () => {
    it(`should call "serverAndEventStreamsHosts" get method with expected arguments`, () => {
      const config = { port, path: 'random' };
      instance.getOneByConfig(config);

      const token = hash(config);
      expect(getSpy.calledWith(token)).to.be.true;
    });
  });
  describe('addOne', () => {
    it(`should call "serverAndEventStreamsHosts" set method with expected arguments`, () => {
      const server = {};
      const config = { port, path: 'random' };

      instance.addOne(config, server as any);

      const token = hash(config);
      expect(setSpy.calledWith(token, server)).to.be.true;
    });
  });
  describe('getAll', () => {
    it('should return "serverAndEventStreamsHosts"', () => {
      const collection = ['test'];
      (instance as any).serverAndEventStreamsHosts = collection;
      expect(instance.getAll()).to.be.eq(collection);
    });
  });
  describe('clear', () => {
    it('should clear hosts collection', () => {
      const collection = { clear: sinon.spy() };
      (instance as any).serverAndEventStreamsHosts = collection;
      instance.clear();
      expect(collection.clear.called).to.be.true;
    });
  });
});
