import { Module, SingleScope } from '@nestjs/core';
import { CommonService } from './core.service';

@Module({
  components: [CommonService],
  exports: [CommonService],
})
export class CommonModule {}
