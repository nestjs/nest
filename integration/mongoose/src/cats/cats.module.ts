import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CatSchema } from './schemas/cat.schema';
import { CatsController } from './cats.controller';
import { CatsService } from './cats.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'Cat', schema: CatSchema }])],
  controllers: [CatsController],
  providers: [CatsService],
})
export class CatsModule {}
