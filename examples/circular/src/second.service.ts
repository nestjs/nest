import { Injectable, Inject, forwardRef } from '@nest/core';

import { FirstService } from './first.service';

@Injectable()
export class SecondService {
  @Inject(forwardRef(() => FirstService))
  private readonly first!: FirstService;
}
