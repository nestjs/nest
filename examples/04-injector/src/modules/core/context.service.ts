import {Component} from '@nestjs/common';
import {CommonService} from '../common/common.service';
import {CoreService} from './core.service';

@Component()
export class ContextService {
  constructor(private readonly commonService: CoreService) {
    console.log('ContextService', commonService);
  }
}