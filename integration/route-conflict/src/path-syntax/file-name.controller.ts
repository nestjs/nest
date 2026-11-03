import { Controller, Get, Param } from '@nestjs/common';

@Controller('files')
export class FileNameController {
  @Get(':name.:ext')
  byName(@Param('name') name: string, @Param('ext') ext: string) {
    return { handler: 'byName', name, ext };
  }

  @Get('readme')
  readme() {
    return { handler: 'readme' };
  }
}
