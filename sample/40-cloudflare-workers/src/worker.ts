import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { createWorkerHandler } from '@nestjs/platform-cloudflare';
import { AppModule } from './app.module.js';
import type { Env } from './env.js';

// What "main.ts" does on Node.js: the handler bootstraps the application on
// the first request, and reuses it for the following ones
export default createWorkerHandler<Env>(AppModule, {
  configure: app => {
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.enableCors();
  },
});
