import { CONNECT_EVENT, MESSAGE_EVENT } from '../../constants';
import { JsonSocket } from '../../helpers/json-socket';
import * as helpers from './helpers';

describe('JsonSocket chaining', () => {
  it('should return the instance when subscribing to event', done => {
    helpers.createServerAndClient((err, server, clientSocket, serverSocket) => {
      if (err) {
        return done(err);
      }

      expect(clientSocket.on(MESSAGE_EVENT, () => {})).toBeInstanceOf(
        JsonSocket,
      );
      expect(clientSocket.on(CONNECT_EVENT, () => {})).toEqual(
        clientSocket,
      );
      expect(
        clientSocket.on(MESSAGE_EVENT, () => {}).on('end', () => {}),
      ).toEqual(clientSocket);

      clientSocket.end();
      server.close(done);
    });
  });
});
