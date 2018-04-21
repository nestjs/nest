import { Get, BadRequestException, Controller } from '@nestjs/common';

@Controller()
export class ErrorsController {
  @Get('sync')
  synchronous() {
    this.throwError();
  }

  @Get('async')
  async asynchronous() {
    this.throwError();
  }

  throwError() {
    throw new BadRequestException('Integration test');
  }
}
