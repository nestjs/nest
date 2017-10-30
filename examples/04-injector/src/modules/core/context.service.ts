import { Component } from '@nestjs/core';
import { CommonService } from '../common/core.service';
import { CoreService } from './common.service';

@Component()
export class ContextService {
  constructor(private readonly coreService: CoreService) {
    console.log('ContextService', coreService);
  }
}
