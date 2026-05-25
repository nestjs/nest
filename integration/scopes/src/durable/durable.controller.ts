import { Controller, Get } from '@nestjs/common';
import { DurableService } from './durable.service.js';
import { NonDurableService } from './non-durable.service.js';

@Controller('durable')
export class DurableController {
  constructor(
    private readonly durableService: DurableService,
    private readonly nonDurableService: NonDurableService,
  ) {}

  @Get()
  greeting(): string {
    return this.durableService.greeting();
  }

  @Get('echo')
  echo() {
    return {
      tenantId: this.durableService.getTenantId(),
    };
  }

  @Get('request-context')
  getRequestContext() {
    return {
      durableService: this.durableService.getTenantId(),
      nonDurableService: this.nonDurableService.getTenantId(),
    };
  }
}
