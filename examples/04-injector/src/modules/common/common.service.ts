import { CoreService } from '../core/core.service';
import { Component } from '';

@Component()
export class CommonService {
  constructor(private readonly coreService: CoreService) {
    console.log('CommonService', coreService);
  }
}
