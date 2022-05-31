import {
  Body,
  Controller,
  Get,
  MaxFileSizeValidator,
  ParseFilePipe,
  ParseFilePipeBuilder,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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

  @UseInterceptors(FileInterceptor('file'))
  @Post('file')
  uploadFile(
    @Body() body: SampleDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return {
      body,
      file: file.buffer.toString(),
    };
  }

  @UseInterceptors(FileInterceptor('file'))
  @Post('file/validated/raw')
  uploadValidatedFile(
    @Body() body: SampleDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 1000,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return {
      body,
      file: file.buffer.toString(),
    };
  }

  @UseInterceptors(FileInterceptor('file'))
  @Post('file/validated/builder')
  uploadValidatedFileWithBuilder(
    @Body(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({
          maxSize: 1000,
        })
        .addFileTypeValidator({
          fileType: 'image/jpeg',
        })
        .build(),
    )
    body: SampleDto,
    @UploadedFile()
    file: Express.Multer.File,
  ) {
    return {
      body,
      file: file.buffer.toString(),
    };
  }
}
