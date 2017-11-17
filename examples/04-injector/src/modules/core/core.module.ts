import {Module} from '@nestjs/common';

import {CommonModule} from '../common/common.module';
import {FeatureModule} from '../feature/feature.module';

import {ContextService} from './context.service';
import {CoreService} from './core.service';

@Module({
  modules : [ CommonModule ],
  components : [ CoreService, ContextService ],
  exports : [ CommonModule ],
})
export class CoreModule {}