import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { LoggingInterceptor } from './interceptors/logging.interceptor.js';
import { RequestChainService } from './request-chain.service.js';

@Controller('hello')
export class RequestChainController {
  constructor(private readonly chainService: RequestChainService) {}

  @UseInterceptors(LoggingInterceptor)
  @Get()
  greeting(): void {
    this.chainService.call();
  }
}
