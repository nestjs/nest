import { Controller, Get } from '@nestjs/common';
import { DurableZooService } from './durable-zoo.service.js';
import { DurableCatsService } from './durable-forward-ref.services.js';
import { DurableService } from './durable.service.js';
import { NonDurableService } from './non-durable.service.js';

@Controller('durable')
export class DurableController {
  constructor(
    private readonly durableService: DurableService,
    private readonly nonDurableService: NonDurableService,
    private readonly durableCatsService: DurableCatsService,
    private readonly durableZooService: DurableZooService,
  ) {}

  @Get('forward-ref')
  forwardRef() {
    return this.durableCatsService.meow();
  }

  @Get('cross-module-forward-ref')
  crossModuleForwardRef() {
    return this.durableZooService.visit();
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
