import { IoAdapter } from '@nestjs/platform-socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { ServerOptions } from 'socket.io';

const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

export class RedisIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    const redisAdapter = createAdapter(pubClient, subClient);
    Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
      server.adapter(redisAdapter);
    });
    return server;
  }
}
