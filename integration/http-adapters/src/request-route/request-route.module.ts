import { All, Controller, Get, Module, Req } from '@nestjs/common';

const describeRoute = (req: any) => ({
  path: req.route?.path,
  methods: req.route?.methods,
});

@Controller('cats')
export class RequestRouteController {
  @Get(':id')
  findOne(@Req() req: any) {
    return describeRoute(req);
  }

  @All('any/:id')
  any(@Req() req: any) {
    return describeRoute(req);
  }
}

@Module({ controllers: [RequestRouteController] })
export class RequestRouteModule {}
