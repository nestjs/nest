import { Component } from '@nestjs/core';
import { CoreService } from '../core/core.service';

@Component()
export class CommonService {
  constructor(private readonly coreService: CoreService) {
    console.log('CommonService', coreService);
  }
}
