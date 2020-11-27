import { Controller, Get } from '@nestjs/common';
import { Readable } from 'stream';
import { AppService } from './app.service';
import { NonFile } from './non-file';

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

  @Get('non-file/pipe-method')
  getNonFile(): NonFile {
    return this.appService.getNonFile();
  }
}