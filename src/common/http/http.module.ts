import { Module } from '../decorators/modules/module.decorator';
import { HttpService } from './http.service';

@Module({
  components: [HttpService],
  exports: [HttpService],
})
export class HttpModule {}
