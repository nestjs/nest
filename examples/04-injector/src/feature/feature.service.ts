import { Injectable } from '@nestjs/common';
import { CommonService } from '../common/common.service';

@Injectable()
export class FeatureService {
  constructor(private readonly commonService: CommonService) {
    console.log('FeatureService', commonService);
  }
}
