import {expect} from 'chai';
import * as sinon from 'sinon';

import {SocketsContainer} from '../container';

describe('SocketsContainer', () => {
  const namespace = 'test';
  const port = 30;

  let instance: SocketsContainer;
  let getSpy: sinon.SinonSpy, setSpy: sinon.SinonSpy;

  beforeEach(() => {
    setSpy = sinon.spy();
    getSpy = sinon.spy();
    instance = new SocketsContainer();
    (<any>instance)['observableServers'] = {get : getSpy, set : setSpy};
  });
  describe('getSocketServer', () => {
    it(`should call "observableServers" get method with expected arguments`,
       () => {
         instance.getServer(namespace, port);
         expect(getSpy.calledWith({namespace, port}));
       });
  });
  describe('storeObservableServer', () => {
    it(`should call "observableServers" set method with expected arguments`,
       () => {
         const server = {};
         instance.addServer(namespace, port, <any>server);
         expect(setSpy.calledWith({namespace, port}, server));
       });
  });
});