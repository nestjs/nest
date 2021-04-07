import { expect } from 'chai';
import * as sinon from 'sinon';

import { SocketsContainer } from '../sockets-container';

describe('SocketsContainer', () => {
  const namespace = 'test';
  const port = 30;

  let instance: SocketsContainer;
  let getSpy: sinon.SinonSpy, setSpy: sinon.SinonSpy;

  beforeEach(() => {
    setSpy = sinon.spy();
    getSpy = sinon.spy();
    instance = new SocketsContainer();
    (instance as any).socketEventHosts = {
      get: getSpy,
      set: setSpy,
    };
  });
  describe('getSocketEventsHostByPort', () => {
    it(`should call "socketEventHosts" get method with expected arguments`, () => {
      instance.getSocketEventsHostByPort(port);
      expect(getSpy.calledWith(port.toString())).to.be.true;
    });
  });
  describe('addSocketEventsHost', () => {
    it(`should call "socketEventHosts" set method with expected arguments`, () => {
      const server = {};
      instance.addSocketEventsHost(namespace, port, server as any);
      expect(setSpy.calledWith(`${namespace}:${port}`, server)).to.be.true;
    });
  });
  describe('getAllSocketEventHosts', () => {
    it('should return "socketEventHosts"', () => {
      const collection = ['test'];
      (instance as any).socketEventHosts = collection;
      expect(instance.getAllSocketEventHosts()).to.be.eq(collection);
    });
  });
  describe('clear', () => {
    it('should clear hosts collection', () => {
      const collection = { clear: sinon.spy() };
      (instance as any).socketEventHosts = collection;
      instance.clear();
      expect(collection.clear.called).to.be.true;
    });
  });
});
