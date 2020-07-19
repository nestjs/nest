import { Controller, Get, Render, WithAlias } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  @Render('index')
  root() {
    return { message: 'Hello world!' };
  }

  @Get('/alias')
  @WithAlias('aliased')
  @Render('aliased')
  aliased() {
    return { message: 'Hello world!' };
  }

  @Get('/alias/:id')
  @WithAlias('aliased_id')
  @Render('aliased')
  aliasedWithId() {
    return { message: 'Hello world!' };
  }
}
