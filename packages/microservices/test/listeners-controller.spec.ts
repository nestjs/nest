import { NestContainer } from '@nestjs/core/injector/container';
import { Injector } from '@nestjs/core/injector/injector';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { MetadataScanner } from '../../core/metadata-scanner';
import { ClientsContainer } from '../container';
import { RpcContextCreator } from '../context/rpc-context-creator';
import { ListenerMetadataExplorer } from '../listener-metadata-explorer';
import { ListenersController } from '../listeners-controller';

describe('ListenersController', () => {
  let instance: ListenersController,
    explorer: sinon.SinonMock,
    metadataExplorer: ListenerMetadataExplorer,
    server,
    addSpy: sinon.SinonSpy;

  before(() => {
    metadataExplorer = new ListenerMetadataExplorer(new MetadataScanner());
    explorer = sinon.mock(metadataExplorer);
  });
  beforeEach(() => {
    instance = new ListenersController(
      new ClientsContainer(),
      sinon.createStubInstance(RpcContextCreator) as any,
      new NestContainer(),
      new Injector(),
    );
    (instance as any).metadataExplorer = metadataExplorer;
    addSpy = sinon.spy();
    server = {
      addHandler: addSpy,
    };
  });
  describe('bindPatternHandlers', () => {
    it(`should call "addHandler" method of server for each pattern handler`, () => {
      const handlers = [
        { pattern: 'test', targetCallback: 'tt' },
        { pattern: 'test2', targetCallback: '2' },
      ];
      explorer.expects('explore').returns(handlers);
      instance.bindPatternHandlers(null, server, '');
      expect(addSpy.calledTwice).to.be.true;
    });
  });
});
