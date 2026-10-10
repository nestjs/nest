import { createServer } from 'node:http';

const body = 'Hello world';

// One writeHead() call with an explicit Content-Length, as Fastify and the
// Nest adapters do; setHeader() per header is measurably slower
createServer((_, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}).listen(3000);
