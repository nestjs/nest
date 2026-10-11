import { Controller, Get, Module, Redirect, Res } from '@nestjs/common';

@Controller()
export class ResponsesController {
  @Get('redirect')
  @Redirect('/target?from=a b', 302)
  redirect() {}

  @Get('redirect-dynamic')
  @Redirect('/default')
  redirectDynamic() {
    return { url: '/dynamic', statusCode: 301 };
  }

  @Get('send-number')
  sendNumber(@Res() res: any) {
    res.send(42);
  }

  @Get('send-boolean')
  sendBoolean(@Res() res: any) {
    res.send(true);
  }

  @Get('typed-array')
  typedArray() {
    return new Uint16Array(new Uint8Array([1, 2, 3, 4]).buffer);
  }

  @Get('data-view')
  dataView() {
    return new DataView(new Uint8Array([9, 1, 2, 3, 9]).buffer, 1, 3);
  }

  @Get('buffer')
  buffer() {
    return Buffer.from([1, 2, 3]);
  }
}

@Module({ controllers: [ResponsesController] })
export class ResponsesModule {}
