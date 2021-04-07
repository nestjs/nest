import { Inject, Injectable, Optional } from '@nestjs/common';

import { CoreService } from './core.service';

@Injectable()
export class DefaultsService {
  constructor(
    @Inject(CoreService)
    @Optional()
    public readonly coreService = { default: true },
  ) {}
}
