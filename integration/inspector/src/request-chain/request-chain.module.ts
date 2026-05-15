import { Module } from '@nestjs/common';
import { HelperModule } from './helper/helper.module.js';
import { RequestChainController } from './request-chain.controller.js';
import { RequestChainService } from './request-chain.service.js';

@Module({
  imports: [HelperModule],
  providers: [RequestChainService],
  controllers: [RequestChainController],
})
export class RequestChainModule {}
