import { Controller, Get, Module } from '@nestjs/common';

@Controller()
class MountPathsController {
  @Get('css/site.css')
  css() {
    return 'css';
  }

  @Get('js/app.js')
  js() {
    return 'js';
  }

  @Get('api/users')
  users() {
    return 'users';
  }
}

@Module({ controllers: [MountPathsController] })
export class MountPathsModule {}
