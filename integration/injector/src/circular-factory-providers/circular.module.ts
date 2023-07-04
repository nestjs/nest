import { Module } from '@nestjs/common';
import {
  dynamicProvider1,
  dynamicProvider2,
  dynamicProvider3,
  dynamicProvider4,
  dynamicProvider5,
} from './circular-factory-providers';

@Module({
  imports: [],
  providers: [dynamicProvider1, dynamicProvider2, dynamicProvider3],
})
export class CircularFactoryProvidersModule {}

@Module({
  imports: [],
  providers: [dynamicProvider4, dynamicProvider5],
})
export class NonCircularFactoryProvidersModule {}
