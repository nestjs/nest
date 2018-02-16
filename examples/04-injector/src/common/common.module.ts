import { Module, SingleScope } from '@nestjs/common';
import { CommonService } from './common.service';

@Module({
  providers: [CommonService],
  exports: [CommonService],
})
export class CommonModule {}
