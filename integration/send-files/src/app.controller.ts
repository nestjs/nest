import { Controller, Get, StreamableFile } from '@nestjs/common';
import { AppService } from './app.service';
import { NonFile } from './non-file';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('file/stream')
  getFile(): StreamableFile {
    return this.appService.getReadStream();
  }

  @Get('file/buffer')
  getBuffer(): StreamableFile {
    return this.appService.getBuffer();
  }

  @Get('non-file/pipe-method')
  getNonFile(): NonFile {
    return this.appService.getNonFile();
  }
}