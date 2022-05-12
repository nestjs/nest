import { Module } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CatsController } from './cats/cats.controller';
import { CatsService } from './cats/cats.service';

@Module({
  imports: [],
  controllers: [CatsController],
  providers: [CatsService, PrismaService],
})
export class AppModule {}
