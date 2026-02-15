import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Photo } from './photo/photo.entity.js';
import { PhotoModule } from './photo/photo.module.js';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mongodb',
      host: 'localhost',
      database: 'test',
      entities: [Photo],
      synchronize: true,
    }),
    PhotoModule,
  ],
})
export class AppModule {}
