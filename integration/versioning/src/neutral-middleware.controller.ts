import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';

@Controller({
  path: 'middleware',
  version: VERSION_NEUTRAL,
})
export class VersionNeutralMiddlewareController {
  @Get('/neutral')
  neutral() {
    return 'Neutral';
  }
}
