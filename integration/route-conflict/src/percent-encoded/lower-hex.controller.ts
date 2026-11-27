import { Controller, Get } from '@nestjs/common';

@Controller('encoded')
export class LowerHexController {
  @Get('%2f')
  lowerHex() {
    return { handler: 'lowerHex' };
  }
}
