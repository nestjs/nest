import { CommonService } from '../common/common.service';
import { Component } from '';

@Component()
export class FeatureService {
  constructor(
    private readonly commonService: CommonService) {
    console.log('FeatureService', commonService);
  }
}
