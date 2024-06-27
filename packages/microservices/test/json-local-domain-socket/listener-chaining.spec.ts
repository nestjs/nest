import { CONNECT_EVENT, MESSAGE_EVENT } from '../../constants';
import { JsonLocalDomainSocket } from '../../helpers/json-local-domain-socket';
import * as helpers from './helpers';
import { expect } from 'chai';

describe('JsonLocalDomainSocket chaining', () => {
  it('should return the instance when subscribing to event', done => {
    helpers.createServerAndClient((err, server, clientSocket, serverSocket) => {
      if (err) {
        return done(err);
      }

      expect(clientSocket.on(MESSAGE_EVENT, () => {})).to.be.instanceof(
        JsonLocalDomainSocket,
      );
      expect(clientSocket.on(CONNECT_EVENT, () => {})).to.deep.equal(
        clientSocket,
      );
      expect(
        clientSocket.on(MESSAGE_EVENT, () => {}).on('end', () => {}),
      ).to.deep.equal(clientSocket);

      clientSocket.end();
      server.close(done);
    });
  });
});
