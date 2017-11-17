import {Module} from '@nestjs/common';

import {CoreModule} from '../core/core.module';

import {FeatureService} from './feature.service';

@Module({
  modules : [ CoreModule ],
  components : [ FeatureService ],
})
export class FeatureModule {}