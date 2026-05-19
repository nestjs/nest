import { Controller, Get, Param } from '@nestjs/common';

@Controller({ path: 'users' })
export class UserImagesController {
  @Get('images')
  images() {
    return { handler: 'images' };
  }

  @Get('images/:imageId')
  imageById(@Param('imageId') imageId: string) {
    return { handler: 'imageById', imageId };
  }
}
