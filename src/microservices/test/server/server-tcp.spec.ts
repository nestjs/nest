import {expect} from 'chai';
import * as sinon from 'sinon';

import {NO_PATTERN_MESSAGE} from '../../constants';
import {ServerTCP} from '../../server/server-tcp';

describe('ServerTCP', () => {
  let server: ServerTCP;
  beforeEach(() => { server = new ServerTCP({}); });

  describe('bindHandler', () => {
    let getSocketInstance;
    const socket = {on : sinon.spy()};
    beforeEach(() => {
      getSocketInstance =
          sinon.stub(server, 'getSocketInstance').callsFake(() => socket);
    });
    it('should bind message event to handler', () => {
      server.bindHandler(null);
      expect(socket.on.called).to.be.true;
    });
  });
  describe('close', () => {
    const tcpServer = {close : sinon.spy()};
    beforeEach(() => { (server as any).server = tcpServer; });
    it('should close server', () => {
      server.close();
      expect(tcpServer.close.called).to.be.true;
    });
  });
  describe('listen', () => {
    const serverMock = {listen : sinon.spy()};
    beforeEach(() => { (server as any).server = serverMock; });
    it('should call native listen method with expected arguments', () => {
      const callback = () => {};
      server.listen(callback);
      expect(serverMock.listen.calledWith((server as any).port, callback))
          .to.be.true;
    });
  });
  describe('handleMessage', () => {
    let socket;
    const msg = {
      pattern : 'test',
      data : 'tests',
    };
    beforeEach(() => {
      socket = {
        sendMessage : sinon.spy(),
      };
    });
    it('should send NO_PATTERN_MESSAGE error if key is not exists in handlers object',
       () => {
         server.handleMessage(socket, msg);
         expect(socket.sendMessage.calledWith({
           status : 'error',
           error : NO_PATTERN_MESSAGE
         })).to.be.true;
       });
    it('should call handler if exists in handlers object', () => {
      const handler = sinon.spy();
      (server as any).messageHandlers = {
        [JSON.stringify(msg.pattern)] : handler as any,
      };
      server.handleMessage(socket, msg);
      expect(handler.calledOnce).to.be.true;
    });
  });

});