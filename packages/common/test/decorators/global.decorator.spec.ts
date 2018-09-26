import 'reflect-metadata';
import { expect } from 'chai';
import { GLOBAL_MODULE_METADATA } from '@nestjs/common/constants';
import { Global } from '@nestjs/common/index';

describe('Global', () => {
  @Global()
  class Test {}

  it('should enrich metatype with GlobalModule metadata', () => {
    const isGlobal = Reflect.getMetadata(GLOBAL_MODULE_METADATA, Test);
    expect(isGlobal).to.be.true;
  });
});
