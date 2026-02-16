import { H3 } from 'h3';
import { toNodeHandler } from 'h3/node';
import * as http from 'node:http';

const h3 = new H3();

h3.get('/', () => 'Hello world');

const server = http.createServer(toNodeHandler(h3));
server.listen(3000);
