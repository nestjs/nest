import { Component } from '@nestjs/common';

@Component()
export class CoreService {
  constructor() {
    console.log('CoreService');
  }
}
