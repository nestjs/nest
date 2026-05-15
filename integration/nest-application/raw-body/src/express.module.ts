import { Module } from '@nestjs/common';
import { ExpressController } from './express.controller.js';

@Module({
  controllers: [ExpressController],
})
export class ExpressModule {}
