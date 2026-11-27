import { Controller, Get } from '@nestjs/common';

@Controller('encoded')
export class UpperHexController {
  @Get('%2F')
  upperHex() {
    return { handler: 'upperHex' };
  }
}
