import { Injectable } from '@nestjs/common';

@Injectable()
export class CoreService {
  constructor() {
    console.log('CoreService');
  }
}
