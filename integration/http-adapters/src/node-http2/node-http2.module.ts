import {
  BadRequestException,
  Body,
  Controller,
  Get,
  type MessageEvent,
  Module,
  Post,
  Req,
  Sse,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, type NodeRequest } from '@nestjs/platform-node';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { interval, map, type Observable, take } from 'rxjs';

export const uploadDir = mkdtempSync(join(tmpdir(), 'nest-node-http2-'));

@Controller()
class Http2Controller {
  @Get()
  describe(@Req() req: NodeRequest) {
    return {
      httpVersion: req.httpVersion,
      protocol: req.protocol,
      hostname: req.hostname,
      secure: req.secure,
    };
  }

  @Post('echo')
  echo(@Body() body: unknown) {
    return { body };
  }

  @Get('error')
  error() {
    throw new BadRequestException('Bad value');
  }

  @Get('file')
  file() {
    return new StreamableFile(Buffer.from('file content'), {
      type: 'text/plain',
    });
  }

  @Sse('events')
  events(): Observable<MessageEvent> {
    return interval(10).pipe(
      take(3),
      map(i => ({ data: { i } })),
    );
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('doc', { dest: uploadDir }))
  upload(@UploadedFile() file: { size: number }) {
    return { size: file.size };
  }
}

@Module({ controllers: [Http2Controller] })
export class NodeHttp2Module {}
