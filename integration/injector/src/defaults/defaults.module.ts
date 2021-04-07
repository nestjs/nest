import { Module } from '@nestjs/common';

import { DefaultsService } from './defaults.service';

@Module({
  providers: [DefaultsService],
})
export class DefaultsModule {}
