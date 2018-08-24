import { Module } from '@nestjs/common';
import {
  MongooseModule,
  MongooseModuleOptions,
  MongooseOptionsFactory,
} from '@nestjs/mongoose';
import { CatsModule } from './cats/cats.module';

class ConfigService implements MongooseOptionsFactory {
  createMongooseOptions(): MongooseModuleOptions {
    return {
      uri: 'mongodb://localhost:27017/test',
    };
  }
}

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useClass: ConfigService,
    }),
    CatsModule,
  ],
})
export class AsyncOptionsClassModule {}
