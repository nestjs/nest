import {
  AddressInfo,
  createServer as netCreateServer,
  Server,
  Socket,
} from 'net';
import { ERROR_EVENT } from '../../constants';
import { JsonSocket } from '../../helpers/json-socket';

export const ip = '127.0.0.1';

export function createServer(callback: (err?: any, server?: Server) => void) {
  const server = netCreateServer();
  server.listen();

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
    clientSocket?: JsonSocket,
    serverSocket?: JsonSocket,
  ) => void,
) {
  const clientSocket = new JsonSocket(new Socket());

  const address = server.address();
  if (!address) {
    throw new Error('server.address() returned null');
  }
  const port = (address as AddressInfo).port;

  clientSocket.connect(port, ip);

  clientSocket.on(ERROR_EVENT, (err: any) => {
    callback(err);
  });

  server.once('connection', socket => {
    const serverSocket = new JsonSocket(socket);
    callback(null, clientSocket, serverSocket);
  });
}

export function createServerAndClient(
  callback: (
    err?: any,
    server?: Server,
    clientSocket?: JsonSocket,
    serverSocket?: JsonSocket,
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
