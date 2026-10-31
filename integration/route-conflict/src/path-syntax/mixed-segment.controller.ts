import { Controller, Get, Param } from '@nestjs/common';

@Controller('releases')
export class MixedSegmentController {
  @Get('v:version')
  byVersion(@Param('version') version: string) {
    return { handler: 'byVersion', version };
  }

  @Get('v1')
  v1() {
    return { handler: 'v1' };
  }
}
