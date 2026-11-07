import {
  Controller,
  Get,
  Header,
  Module,
  StreamableFile,
} from '@nestjs/common';
import { Readable } from 'stream';

const STREAM = 'hello world';

@Controller('chunked')
export class ChunkedController {
  @Get('object')
  @Header('Transfer-Encoding', 'chunked')
  object() {
    return { hello: 'world' };
  }

  @Get('text')
  @Header('Transfer-Encoding', 'chunked')
  text() {
    return 'plain';
  }

  @Get('stream')
  @Header('Transfer-Encoding', 'chunked')
  stream() {
    return new StreamableFile(Readable.from([STREAM]), {
      length: STREAM.length,
      type: 'text/plain; charset=utf-8',
    });
  }
}

@Module({ controllers: [ChunkedController] })
export class TransferEncodingModule {}
