import { Controller, Get, Ip, Module, Query, Req } from '@nestjs/common';

@Controller()
export class RequestOptionsController {
  @Get('client')
  client(@Ip() ip: string, @Req() req: { protocol: string; hostname: string }) {
    return { ip, protocol: req.protocol, hostname: req.hostname };
  }

  @Get('search')
  search(@Query() query: unknown) {
    return query;
  }
}

@Module({ controllers: [RequestOptionsController] })
export class RequestOptionsModule {}
