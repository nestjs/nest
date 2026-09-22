import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AppController, RecordingExceptionFilter } from './app.controller.js';

@Module({
  controllers: [AppController],
  providers: [{ provide: APP_FILTER, useClass: RecordingExceptionFilter }],
})
export class AppModule {}
