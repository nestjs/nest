import { Module } from '@nestjs/common';
import { NewModuleService } from './new-module.service';
import { NewModuleController } from './new-module.controller';

@Module({
  controllers: [NewModuleController],
  providers: [NewModuleService],
})
export class NewModuleModule {}
