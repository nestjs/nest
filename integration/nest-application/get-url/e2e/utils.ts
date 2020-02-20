import * as net from 'net';

export let port: number;

export async function randomPort(): Promise<number> {
  const server = net.createServer();
  return new Promise((resolve, reject) => {
    if (port) {
      resolve(port);
    }
    server.listen(0, () => {
      port = (server.address() as net.AddressInfo).port;
      server.close();
      resolve(port);
    });
  });
}
