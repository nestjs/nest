import { Module } from '@nestjs/common';
import { ApplicationGateway } from './app.gateway.js';

@Module({
  providers: [ApplicationGateway],
})
export class ApplicationModule {}
