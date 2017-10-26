import { CommonService } from './common.service';
import { Module, SingleScope } from '';

@Module({
  components: [CommonService],
  exports: [CommonService],
})
export class CommonModule {}
