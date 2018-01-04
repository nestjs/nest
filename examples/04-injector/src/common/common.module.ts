import { Module, SingleScope } from '@nestjs/common';
import { CommonService } from './common.service';

@Module({
  components: [CommonService],
  exports: [CommonService],
})
export class CommonModule {}
