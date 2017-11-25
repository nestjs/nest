import {Module} from '@nestjs/common';
import {EventsModule} from './events/events.module';

@Module({
  modules : [ EventsModule ],
})
export class ApplicationModule {}