import { JsonSocket } from '../../helpers/json-socket.js';
import * as helpers from './helpers.js';

const MESSAGE_EVENT = 'message';

describe('JsonSocket chaining', () => {
  it('should return the instance when subscribing to event', () =>
    new Promise<void>(done => {
      helpers.createServerAndClient(
        (err, server, clientSocket, serverSocket) => {
          if (err) {
            return done(err);
          }

          expect(clientSocket!.on(MESSAGE_EVENT, () => {})).toBeInstanceOf(
            JsonSocket,
          );
          expect(clientSocket!.on('connect', () => {})).toEqual(clientSocket);
          expect(
            clientSocket!.on(MESSAGE_EVENT, () => {}).on('end', () => {}),
          ).toEqual(clientSocket);

          clientSocket!.end();
          server!.close(done);
        },
      );
    }));
});
