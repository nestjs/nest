import { expect } from 'chai';
import { AddressInfo, createServer, Socket } from 'net';

import { CONNECT_EVENT, MESSAGE_EVENT } from '../../constants';
import { JsonSocket } from '../../helpers/json-socket';

import { longPayload } from './data/long-payload-with-special-chars';
import * as helpers from './helpers';
import { ip } from './helpers';

describe('JsonSocket connection', () => {
  it('should connect, send and receive message', done => {
    helpers.createServerAndClient(
      (error, server, clientSocket, serverSocket) => {
        if (error) {
          return done(error);
        }

        expect(clientSocket['isClosed']).to.be.false;
        expect(serverSocket['isClosed']).to.be.false;

        Promise.all([
          new Promise(callback => {
            clientSocket.sendMessage({ type: 'ping' }, callback);
          }),
          new Promise<void>(callback => {
            clientSocket.on(MESSAGE_EVENT, (message: string) => {
              expect(message).to.deep.equal({ type: 'pong' });
              callback();
            });
          }),
          new Promise(callback => {
            serverSocket.on(MESSAGE_EVENT, (message: string) => {
              expect(message).to.deep.equal({ type: 'ping' });
              serverSocket.sendMessage({ type: 'pong' }, callback);
            });
          }),
        ])
          .then(() => {
            expect(clientSocket['isClosed']).to.equal(false);
            expect(serverSocket['isClosed']).to.equal(false);
            clientSocket.end();
            server.close(done);
          })
          .catch(e => done(e));
      },
    );
  });

  it('should send long messages with special characters without issues', done => {
    helpers.createServerAndClient((err, server, clientSocket, serverSocket) => {
      if (err) {
        return done(err);
      }
      expect(clientSocket['isClosed']).to.equal(false);
      expect(serverSocket['isClosed']).to.equal(false);
      Promise.all([
        new Promise<void>(callback => {
          clientSocket.sendMessage(longPayload, callback);
        }),
        new Promise<void>(callback => {
          clientSocket.on(MESSAGE_EVENT, (message: { type: 'pong' }) => {
            expect(message).to.deep.equal({ type: 'pong' });
            callback();
          });
        }),
        new Promise<void>(callback => {
          serverSocket.on(MESSAGE_EVENT, (message: { type: 'pong' }) => {
            expect(message).to.deep.equal(longPayload);
            serverSocket.sendMessage({ type: 'pong' }, callback);
          });
        }),
      ])
        .then(() => {
          expect(clientSocket['isClosed']).to.equal(false);
          expect(serverSocket['isClosed']).to.equal(false);
          clientSocket.end();
          server.close(done);
        })
        .catch(e => done(e));
    });
  });

  it('should send multiple messages', done => {
    helpers.createServerAndClient((err, server, clientSocket, serverSocket) => {
      if (err) {
        return done(err);
      }
      Promise.all([
        new Promise<void>(callback =>
          Promise.all(
            helpers
              .range(1, 100)
              .map(
                i =>
                  new Promise(resolve =>
                    clientSocket.sendMessage({ number: i }, resolve),
                  ),
              ),
          ).then(_ => callback()),
        ),
        new Promise<void>(callback => {
          let lastNumber = 0;
          serverSocket.on(MESSAGE_EVENT, (message: { number: number }) => {
            expect(message.number).to.deep.equal(lastNumber + 1);
            lastNumber = message.number;
            if (lastNumber === 100) {
              callback();
            }
          });
        }),
      ])
        .then(() => {
          clientSocket.end();
          server.close(done);
        })
        .catch(e => done(e));
    });
  });

  it('should return true for "closed" when server disconnects', done => {
    helpers.createServerAndClient((err, server, clientSocket, serverSocket) => {
      if (err) {
        return done(err);
      }

      new Promise(callback => {
        serverSocket.end();
        setTimeout(callback, 10);
      })
        .then(
          () =>
            new Promise<void>(callback => {
              expect(clientSocket['isClosed']).to.equal(true);
              expect(serverSocket['isClosed']).to.equal(true);
              callback();
            }),
        )
        .then(() => {
          clientSocket.end();
          server.close(done);
        })
        .catch(e => done(e));
    });
  });

  it('should return true for "closed" when client disconnects', done => {
    helpers.createServerAndClient((err, server, clientSocket, serverSocket) => {
      if (err) {
        return done(err);
      }

      new Promise(callback => {
        clientSocket.end();
        setTimeout(callback, 10);
      })
        .then(
          () =>
            new Promise<void>(callback => {
              expect(clientSocket['isClosed']).to.equal(true);
              expect(serverSocket['isClosed']).to.equal(true);
              callback();
            }),
        )
        .then(() => server.close(done))
        .catch(e => done(e));
    });
  });

  it('should return true for "closed" when client (re)connects', done => {
    const server = createServer();

    server.on('listening', () => {
      const clientSocket = new JsonSocket(new Socket());

      server.once('connection', socket => {
        const serverSocket = new JsonSocket(socket);

        serverSocket.once('end', () => {
          setTimeout(() => {
            expect(serverSocket['isClosed']).to.equal(true);
            expect(clientSocket['isClosed']).to.equal(true);

            clientSocket.on(CONNECT_EVENT, () => {
              setTimeout(() => {
                expect(clientSocket['isClosed']).to.equal(false);

                clientSocket.end();
                server.close(done);
              }, 10);
            });

            const address2 = server.address();
            if (!address2) {
              throw new Error('server.address() returned null');
            }
            const port2 = (address2 as AddressInfo).port;

            clientSocket.connect(port2, ip);
          }, 10);
        });

        clientSocket.end();
      });

      const address1 = server.address();
      if (!address1) {
        throw new Error('server.address() returned null');
      }
      const port1 = (address1 as AddressInfo).port;

      clientSocket.connect(port1, ip);
    });
    server.listen();
  });
});
