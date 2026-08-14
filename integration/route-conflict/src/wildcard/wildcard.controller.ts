import { Controller, Get, Param } from '@nestjs/common';

@Controller('files')
export class WildcardController {
  @Get('*path')
  catchAll() {
    return { handler: 'catchAll' };
  }

  @Get(':fileId')
  byId(@Param('fileId') fileId: string) {
    return { handler: 'byId', fileId };
  }

  @Get('readme')
  readme() {
    return { handler: 'readme' };
  }
}
