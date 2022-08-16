import { Controller, Get, StreamableFile } from '@nestjs/common';
import { Observable } from 'rxjs';
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

  @Get('file/rxjs/stream')
  getRxJSFile(): Observable<StreamableFile> {
    return this.appService.getRxJSFile();
  }

  @Get('file/with/headers')
  getFileWithHeaders(): StreamableFile {
    return this.appService.getFileWithHeaders();
  }

  @Get('file/not/exist')
  getNonExistantFile(): StreamableFile {
    return this.appService.getFileThatDoesNotExist();
  }

  @Get('/file/slow')
  getSlowFile(): StreamableFile {
    return this.appService.getSlowStream();
  }
}
