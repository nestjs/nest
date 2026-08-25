import { Controller, Get } from '@nestjs/common';
import { DurableCatsService } from './durable-forward-ref.services';
import { DurableService } from './durable.service';
import { NonDurableService } from './non-durable.service';

@Controller('durable')
export class DurableController {
  constructor(
    private readonly durableService: DurableService,
    private readonly nonDurableService: NonDurableService,
    private readonly durableCatsService: DurableCatsService,
  ) {}

  @Get('forward-ref')
  forwardRef() {
    return this.durableCatsService.meow();
  }

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
