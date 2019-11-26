import { Controller, Get } from '@nestjs/common';
import { RequestChainService } from './request-chain.service';

@Controller('hello')
export class RequestChainController {
  constructor(private readonly chainService: RequestChainService) {}

  @Get()
  greeting(): void {
    this.chainService.call();
  }
}
