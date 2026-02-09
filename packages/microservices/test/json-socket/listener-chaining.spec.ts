import { expect } from 'chai';
import { TcpEventsMap } from '../../events/tcp.events.js';
import { JsonSocket } from '../../helpers/json-socket.js';
import * as helpers from './helpers.js';

const MESSAGE_EVENT = 'message';

describe('JsonSocket chaining', () => {
  it('should return the instance when subscribing to event', done => {
    helpers.createServerAndClient((err, server, clientSocket, serverSocket) => {
      if (err) {
        return done(err);
      }

      expect(clientSocket!.on(MESSAGE_EVENT, () => {})).to.be.instanceof(
        JsonSocket,
      );
      expect(clientSocket!.on(TcpEventsMap.CONNECT, () => {})).to.deep.equal(
        clientSocket,
      );
      expect(
        clientSocket!.on(MESSAGE_EVENT, () => {}).on('end', () => {}),
      ).to.deep.equal(clientSocket);

      clientSocket!.end();
      server!.close(done);
    });
  });
});
