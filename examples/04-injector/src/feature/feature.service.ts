import { Component } from '@nestjs/common';
import { CommonService } from '../common/common.service';

@Component()
export class FeatureService {
  constructor(private readonly commonService: CommonService) {
    console.log('FeatureService', commonService);
  }
}
