import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { HooksController } from './hooks.controller.js';

@Module({
  controllers: [AppController, HooksController],
})
export class AppModule {}
