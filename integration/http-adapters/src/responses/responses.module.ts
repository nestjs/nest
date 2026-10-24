import { Controller, Get, Module, Param, Redirect, Res } from '@nestjs/common';
import { join } from 'path';
import { fileURLToPath } from 'url';

export const FILES_DIR = fileURLToPath(new URL('./files', import.meta.url));

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

  @Get('files/:name')
  sendFile(@Param('name') name: string, @Res() res: any) {
    res.sendFile(join(FILES_DIR, name));
  }

  @Get('rooted/:name')
  sendRootedFile(@Param('name') name: string, @Res() res: any) {
    res.sendFile(name, { root: FILES_DIR });
  }

  @Get('files-or-gone/:name')
  sendFileOrGone(@Param('name') name: string, @Res() res: any) {
    res.sendFile(join(FILES_DIR, name), (err?: Error) => {
      if (err && !res.headersSent) {
        res.status(410).send('gone');
      }
    });
  }
}

@Module({ controllers: [ResponsesController] })
export class ResponsesModule {}
