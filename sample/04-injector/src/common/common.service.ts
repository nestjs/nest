import { Injectable } from '@nestjs/common';
import { CoreService } from '../core/core.service';

@Injectable()
export class CommonService {
  constructor(private readonly coreService: CoreService) {
    console.log('CommonService', coreService);
  }
}
