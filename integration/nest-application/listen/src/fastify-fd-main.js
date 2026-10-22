import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';

// Plain JS with decorators applied by hand: under `--import jiti/register`,
// Fastify fails to load on some Node versions (22.16, for one).
class AppController {
  getHello() {
    return 'Hello World!';
  }
}
Get()(
  AppController.prototype,
  'getHello',
  Object.getOwnPropertyDescriptor(AppController.prototype, 'getHello'),
);
Controller()(AppController);

class AppModule {}
Module({ controllers: [AppController] })(AppModule);

const app = await NestFactory.create(AppModule, new FastifyAdapter(), {
  logger: false,
});

// The socket is inherited as fd 3, as systemd passes it on socket activation.
await app.listen({ fd: 3 });
console.log('listening');
