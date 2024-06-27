import { createServer as netCreateServer, Server, Socket } from 'net';
import { ERROR_EVENT } from '../../constants';
import { JsonLocalDomainSocket } from '../../helpers/json-local-domain-socket';
import * as nodePath from 'path';

export const path =
  process.platform === 'win32'
    ? nodePath.join('\\\\.\\pipe', 'test-json-local-domain-socket-pipe-path')
    : '\0json-local-domain-socket-abstract-path';

export function createServer(callback: (err?: any, server?: Server) => void) {
  const server = netCreateServer();
  server.listen(path);

  server.on('listening', () => {
    callback(null, server);
  });

  server.on(ERROR_EVENT, (err: any) => {
    callback(err);
  });
}

export function createClient(
  server: Server,
  callback: (
    err?: any,
    clientSocket?: JsonLocalDomainSocket,
    serverSocket?: JsonLocalDomainSocket,
  ) => void,
) {
  const clientSocket = new JsonLocalDomainSocket(new Socket());

  const address = server.address();
  if (!address) {
    throw new Error('server.address() returned null');
  }
  const path = address as string;

  clientSocket.connect(path);

  clientSocket.on(ERROR_EVENT, (err: any) => {
    callback(err);
  });

  server.once('connection', socket => {
    const serverSocket = new JsonLocalDomainSocket(socket);
    callback(null, clientSocket, serverSocket);
  });
}

export function createServerAndClient(
  callback: (
    err?: any,
    server?: Server,
    clientSocket?: JsonLocalDomainSocket,
    serverSocket?: JsonLocalDomainSocket,
  ) => void,
) {
  createServer((serverErr, server) => {
    if (serverErr) {
      return callback(serverErr);
    }

    createClient(server, (clientErr, clientSocket, serverSocket) => {
      if (clientErr) {
        return callback(clientErr);
      }

      callback(null, server, clientSocket, serverSocket);
    });
  });
}

export function range(start: number, end: number) {
  const r = [];
  for (let i = start; i <= end; i++) {
    r.push(i);
  }
  return r;
}
