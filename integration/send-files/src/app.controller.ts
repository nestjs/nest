import { Controller, Get } from '@nestjs/common';
import { Readable } from 'stream';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('file/stream')
  getFile(): Readable {
    return this.appService.getReadStream();
  }

  @Get('file/buffer')
  getBuffer(): Buffer {
    return this.appService.getBuffer();
  }
}