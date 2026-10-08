import { createServer } from 'node:http';

createServer((_, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('Hello world');
}).listen(3000);
