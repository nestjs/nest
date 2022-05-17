import { Module } from '@nestjs/common';
import { ExpressController } from './express.controller';

@Module({
  controllers: [ExpressController],
})
export class ExpressModule {}
