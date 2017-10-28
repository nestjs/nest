import { Component } from '@nestjs/core';
import { CommonService } from '../common/core.service';

@Component()
export class FeatureService {
  constructor(
    private readonly coreService: CommonService) {
    console.log('FeatureService', coreService);
  }
}
