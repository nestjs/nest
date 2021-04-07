import { Injectable } from '@nestjs/common';

import { HelperService } from './helper/helper.service';

@Injectable()
export class RequestChainService {
  static COUNTER = 0;
  constructor(private readonly helperService: HelperService) {
    helperService.noop();
    RequestChainService.COUNTER += 1;
  }

  call() {
    this.helperService.noop();
  }
}
