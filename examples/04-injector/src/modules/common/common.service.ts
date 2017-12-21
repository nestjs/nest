import { Component } from '@nestjs/common';
import { CoreService } from '../core/core.service';

@Component()
export class CommonService {
  constructor(private readonly coreService: CoreService) {
    console.log('CommonService', coreService);
  }
}
