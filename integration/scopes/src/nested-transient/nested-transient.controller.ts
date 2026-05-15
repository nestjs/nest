import { Controller, Get, Scope } from '@nestjs/common';
import { FirstRequestService } from './first-request.service.js';
import { SecondRequestService } from './second-request.service.js';

@Controller({ path: 'nested-transient', scope: Scope.REQUEST })
export class NestedTransientController {
  static COUNTER = 0;

  constructor(
    private readonly firstService: FirstRequestService,
    private readonly secondService: SecondRequestService,
  ) {
    NestedTransientController.COUNTER++;
  }

  @Get()
  getIsolationData() {
    return {
      firstServiceContext: this.firstService.logger.getNestedContext(),
      firstServiceNestedId: this.firstService.logger.getNestedInstanceId(),
      secondServiceContext: this.secondService.logger.getNestedContext(),
      secondServiceNestedId: this.secondService.logger.getNestedInstanceId(),
    };
  }
}
