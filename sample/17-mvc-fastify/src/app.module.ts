import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
