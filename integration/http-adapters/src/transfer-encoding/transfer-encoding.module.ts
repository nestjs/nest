import { Controller, Get, Header, Module } from '@nestjs/common';

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
}

@Module({ controllers: [ChunkedController] })
export class TransferEncodingModule {}
