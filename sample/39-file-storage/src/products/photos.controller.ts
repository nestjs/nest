import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  InjectDisk,
  serveFile,
  StorageDisk,
  uploadToDisk,
  type StoredUpload,
} from '@nestjs/storage';
import type { Request, Response } from 'express';
import {
  MAX_PHOTO_SIZE,
  PHOTO_CACHE_CONTROL,
  PHOTO_TYPES,
} from './photo-rules.js';
import { PhotosService } from './photos.service.js';

@Controller()
export class PhotosController {
  constructor(
    private readonly photosService: PhotosService,
    @InjectDisk('photos') private readonly photos: StorageDisk,
  ) {}

  @Post('products/:id/photo')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: uploadToDisk({
        disk: 'photos',
        contentTypes: PHOTO_TYPES,
        cacheControl: PHOTO_CACHE_CONTROL,
      }),
      limits: { fileSize: MAX_PHOTO_SIZE, files: 1 },
    }),
  )
  upload(
    @Param('id') id: string,
    @UploadedFile() file: StoredUpload | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('Attach the image as the "photo" field');
    }
    return this.photosService.replace(id, file.key);
  }

  // The mobile app asks for an upload URL, sends the photo there, then submits its key
  @Post('products/:id/photo/uploads')
  createUpload(
    @Param('id') id: string,
    @Body() body: { contentType: string; size: number },
  ) {
    return this.photosService.createUpload(id, body.contentType, body.size);
  }

  @Put('products/:id/photo')
  completeUpload(@Param('id') id: string, @Body('key') key: string) {
    return this.photosService.completeUpload(id, key);
  }

  // Development only: in production a CDN serves the photos bucket at `publicUrl`
  @Get('photos/:file')
  serve(
    @Param('file') file: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return serveFile(this.photos, file, { req, res, disposition: 'inline' });
  }
}
