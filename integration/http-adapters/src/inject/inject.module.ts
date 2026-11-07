import {
  Body,
  Controller,
  Get,
  Header,
  Module,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  StreamableFile,
} from '@nestjs/common';
import { Readable } from 'stream';

@Controller('inject')
export class InjectController {
  @Get('items/:id')
  find(
    @Param('id') id: string,
    @Query('q') q: string,
    @Req() req: { headers: Record<string, string> },
  ) {
    return { id, q, token: req.headers['x-token'] };
  }

  @Post('echo')
  echo(@Body() body: unknown) {
    return body;
  }

  @Get('stream')
  @Header('Content-Type', 'text/plain')
  stream() {
    return new StreamableFile(Readable.from(['one ', 'two ', 'three']));
  }

  @Get('missing')
  missing() {
    throw new NotFoundException('No such item');
  }
}

@Module({ controllers: [InjectController] })
export class InjectModule {}
