import { Controller, Get, Ip, Module, Req } from '@nestjs/common';

@Controller()
export class RequestOptionsController {
  @Get('client')
  client(@Ip() ip: string, @Req() req: { protocol: string; hostname: string }) {
    return { ip, protocol: req.protocol, hostname: req.hostname };
  }
}

@Module({ controllers: [RequestOptionsController] })
export class RequestOptionsModule {}
