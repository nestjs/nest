import { Controller, Get } from '@nestjs/common';
import { DurableService } from './durable.service';

@Controller('durable')
export class DurableController {
  constructor(private readonly durableService: DurableService) {}

  @Get()
  greeting(): string {
    return this.durableService.greeting();
  }

  @Get('echo')
  echo() {
    return this.durableService.requestPayload;
  }

  @Get('is-req-defined')
  getIfReqObjectIsDefined(): string {
    return this.durableService.requestPayload ? 'yes' : 'no';
  }
}
