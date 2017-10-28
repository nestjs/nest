import { Module, SingleScope } from '@nestjs/core';
import { CommonService } from './common.service';

@Module({
  components: [CommonService],
  exports: [CommonService],
})
export class CommonModule {}
