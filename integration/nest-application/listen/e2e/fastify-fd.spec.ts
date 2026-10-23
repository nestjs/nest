import { ChildProcess, spawn } from 'child_process';
import { AddressInfo, createServer } from 'net';
import { join } from 'path';

const waitUntilListening = (child: ChildProcess) =>
  new Promise<void>((resolve, reject) => {
    let stderr = '';
    child.stderr!.on('data', chunk => (stderr += chunk));
    child.stdout!.on('data', chunk => {
      if (String(chunk).includes('listening')) {
        resolve();
      }
    });
    child.on('exit', code =>
      reject(new Error(`The app exited with code ${code}: ${stderr}`)),
    );
  });

// Node cannot listen on a file descriptor on Windows.
describe.skipIf(process.platform === 'win32')(
  'Listen on a file descriptor (Fastify Application)',
  () => {
    let child: ChildProcess;

    afterEach(() => {
      child?.kill();
    });

    it('should listen on the socket the process inherits', async () => {
      // A process cannot listen on a descriptor that its own event loop
      // already watches (EEXIST), so the app runs in a child process that
      // inherits the socket as fd 3, as with systemd socket activation.
      const server = createServer();
      await new Promise<void>(resolve =>
        server.listen(0, '127.0.0.1', resolve),
      );
      const { port } = server.address() as AddressInfo;

      child = spawn(
        process.execPath,
        [join(import.meta.dirname, '../src/fastify-fd-main.js')],
        { stdio: ['ignore', 'pipe', 'pipe', (server as any)._handle.fd] },
      );
      server.close();
      await waitUntilListening(child);

      const response = await fetch(`http://127.0.0.1:${port}`);
      expect(response.status).toBe(200);
      await expect(response.text()).resolves.toBe('Hello World!');
    });
  },
);
