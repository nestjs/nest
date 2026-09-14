import { Controller, Get, VERSION_NEUTRAL, Version } from '@nestjs/common';

@Controller()
export class MultipleVersionNeutralController {
  @Version([VERSION_NEUTRAL, '2'])
  @Get('/multiple-neutral')
  multipleNeutral() {
    return 'Multiple Versions Neutral or 2';
  }
}
