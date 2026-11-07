import { Controller, Get, Module, Query, Req } from '@nestjs/common';

@Controller('range')
export class RequestRangeController {
  @Get()
  range(@Req() req: any, @Query('combine') combine?: string) {
    const ranges = req.range(1000, { combine: combine === 'true' });
    return { ranges: ranges ?? null, type: ranges?.type };
  }
}

@Module({ controllers: [RequestRangeController] })
export class RequestRangeModule {}
