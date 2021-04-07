import { Module } from '@nestjs/common';

import { ApplicationGateway } from './app.gateway';

@Module({
  providers: [ApplicationGateway],
})
export class ApplicationModule {}
