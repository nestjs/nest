import { Module } from '@nestjs/common';
import {
  TypeOrmModule,
  TypeOrmModuleOptions,
  TypeOrmOptionsFactory,
} from '@nestjs/typeorm';
import { Photo } from './photo/photo.entity.js';
import { PhotoModule } from './photo/photo.module.js';

class ConfigService implements TypeOrmOptionsFactory {
  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: 'mysql',
      host: '127.0.0.1',
      port: 3306,
      username: 'root',
      password: 'root',
      database: 'test',
      entities: [Photo],
      synchronize: true,
      retryAttempts: 2,
      retryDelay: 1000,
    };
  }
}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useClass: ConfigService,
    }),
    PhotoModule,
  ],
})
export class AsyncOptionsClassModule {}
