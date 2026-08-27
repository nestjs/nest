import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  async connectToRedis(): Promise<void> {
    const pubClient = createClient({
      url: `redis://localhost:6379`,
      clientInfoTag: this.getClientInfoTag(),
    });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }

  private getClientInfoTag(): string {
    try {
      // Try to get NestJS version from package.json
      const entrypoint = fileURLToPath(import.meta.resolve('@nestjs/common'));
      const { version } = JSON.parse(
        readFileSync(join(dirname(entrypoint), 'package.json'), 'utf8'),
      );
      return `nestjs_v${version}`;
    } catch {
      // Fallback if version cannot be determined
      return 'nestjs';
    }
  }
}
