import { Module } from '@nestjs/common';
import { FilesController } from './files.controller.js';

@Module({
  controllers: [FilesController],
})
export class FilesModule {}
