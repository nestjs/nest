import { Module } from '@nestjs/common';
import { CloudflareModule } from '@nestjs/platform-cloudflare';
import { AppController } from './app.controller.js';
import { CatsModule } from './cats/cats.module.js';

@Module({
  imports: [CloudflareModule, CatsModule],
  controllers: [AppController],
})
export class AppModule {}
