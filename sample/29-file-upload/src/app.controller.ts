import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import {
  FileInterceptor,
  FilesInterceptor,
  FileFieldsInterceptor,
  AnyFilesInterceptor,
} from '@nestjs/platform-express';
import { Express } from 'express';
import { AppService } from './app.service';
import { SampleDto } from './sample.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  sayHello() {
    return this.appService.getHello();
  }

  @UseInterceptors(FileInterceptor('file', { throwsOnNotFound: true }))
  @Post('file')
  uploadFile(
    @Body() body: SampleDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const buf = file.buffer.toString();
    return {
      body,
      file: buf,
    };
  }

  @UseInterceptors(FilesInterceptor('files', { throwsOnNotFound: true }))
  @Post('fileArr')
  uploadFileArray(
    @Body() body: SampleDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const bufs = files.map(f => f.buffer.toString());
    return {
      body,
      files: bufs,
    };
  }

  @UseInterceptors(AnyFilesInterceptor({ throwsOnNotFound: true }))
  @Post('anyFiles')
  uploadAnyFiles(
    @Body() body: SampleDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const bufs = files.map(f => f.buffer.toString());
    return {
      body,
      files: bufs,
    };
  }

  @UseInterceptors(FileFieldsInterceptor([{ name: 'file' }, { name: 'file2' }]))
  @Post('files')
  uploadFiles(
    @Body() body: SampleDto,
    @UploadedFiles() files: { [name: string]: Express.Multer.File[] },
  ) {
    const bufs = Object.values(files)
      .map(arr => arr.map(f => f.buffer.toString()))
      .reduce((a, o) => [...a, ...o]);
    return {
      body,
      files: bufs,
    };
  }
}
