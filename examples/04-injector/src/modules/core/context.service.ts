import { Component } from '@nestjs/core';
import { CommonService } from '../core/core.service';
import { CoreService } from './core.service';

@Component()
export class ContextService {
  constructor(private readonly coreService: CoreService) {
    console.log('ContextService', coreService);
  }
}
