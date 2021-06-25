import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';

@Controller({
  version: VERSION_NEUTRAL,
})
export class VersionNeutralController {
  @Get('/neutral')
  neutral() {
    return 'Neutral';
  }
}
