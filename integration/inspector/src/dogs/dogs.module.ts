import { Module } from '@nestjs/common';
import { DogsService } from './dogs.service.js';
import { DogsController } from './dogs.controller.js';

@Module({
  controllers: [DogsController],
  providers: [DogsService],
})
export class DogsModule {}
