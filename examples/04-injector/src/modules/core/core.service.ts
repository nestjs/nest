import { Component } from '@nestjs/core';

@Component()
export class CoreService {
  constructor() {
    console.log('CoreService');
  }
}
