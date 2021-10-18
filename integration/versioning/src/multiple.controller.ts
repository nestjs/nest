import { Controller, Get } from '@nestjs/common';

@Controller({
  version: ['1', '2'],
})
export class MultipleVersionController {
  @Get('/multiple')
  multiple() {
    return 'Multiple Versions 1 or 2';
  }
}
