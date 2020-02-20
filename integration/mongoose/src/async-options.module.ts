import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CatsModule } from './cats/cats.module';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: () => ({
        useNewUrlParser: true,
        uri: 'mongodb://localhost:27017/test',
      }),
    }),
    CatsModule,
  ],
})
export class AsyncOptionsFactoryModule {}
