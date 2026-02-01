import Fastify from 'fastify';

const fastify = Fastify({
  logger: false,
});
fastify.get('/', async (_, reply) => reply.send('Hello world'));
fastify
  .listen({
    port: 3000,
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
