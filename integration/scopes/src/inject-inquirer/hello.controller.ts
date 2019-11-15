import { Controller, Get, Scope } from '@nestjs/common';
import { HelloRequestService } from './hello-request/hello-request.service';
import { HelloTransientService } from './hello-transient/hello-transient.service';

@Controller({
  path: 'hello',
  scope: Scope.REQUEST,
})
export class HelloController {
  constructor(
    private readonly helloTransientService: HelloTransientService,
    private readonly helloRequestService: HelloRequestService,
  ) {}

  @Get('transient')
  greetingTransient() {
    this.helloTransientService.greeting();
  }

  @Get('request')
  greetingRequest() {
    this.helloRequestService.greeting();
    this.helloRequestService.farewell();
  }
}
