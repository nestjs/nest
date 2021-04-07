import { Injectable } from '@nestjs/common';

import { CoreService } from './core.service';

@Injectable()
export class InjectService {
  constructor(private readonly coreService: CoreService) {}
}
