import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PhotoModule } from './photo/photo.module';
import { Photo } from './photo/photo.entity';

@Module({
  modules: [TypeOrmModule.forRoot([Photo]), PhotoModule],
})
export class ApplicationModule {}
