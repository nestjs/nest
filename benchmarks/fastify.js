'use strict';

const fastify = require('fastify')();
fastify.get('/', async (req, reply) => reply.send('Hello world'));
fastify.listen(3000);
