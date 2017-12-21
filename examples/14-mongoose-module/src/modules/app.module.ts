import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CatsModule } from './cats/cats.module';
import { CatSchema } from './cats/schemas/cat.schema';

@Module({
  modules: [
    MongooseModule.forRoot('mongodb://localhost/nest', [
      { name: 'Cat', schema: CatSchema }
    ]),
    CatsModule
  ]
})
export class ApplicationModule {}
