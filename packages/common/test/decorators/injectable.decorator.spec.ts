import { expect } from 'chai';
import { SCOPE_OPTIONS_METADATA, INJECTABLE_WATERMARK } from '../../constants';
import { Injectable, mixin } from '../../index';

describe('@Injectable', () => {
  const options = {};

  @Injectable(options)
  class TestMiddleware {
    constructor(_param: number, _test: string) {}
  }

  it(`should enhance component with "${INJECTABLE_WATERMARK}" metadata`, () => {
    const injectableWatermark = Reflect.getMetadata(
      INJECTABLE_WATERMARK,
      TestMiddleware,
    );

    expect(injectableWatermark).to.be.eql(true);
  });

  it('should enhance component with "design:paramtypes" metadata', () => {
    const constructorParams = Reflect.getMetadata(
      'design:paramtypes',
      TestMiddleware,
    );

    expect(constructorParams[0]).to.be.eql(Number);
    expect(constructorParams[1]).to.be.eql(String);
  });

  it(`should enhance component with "${SCOPE_OPTIONS_METADATA}" metadata`, () => {
    const constructorParams = Reflect.getMetadata(
      SCOPE_OPTIONS_METADATA,
      TestMiddleware,
    );

    expect(constructorParams).to.be.eql(options);
  });
});

describe('mixin', () => {
  @Injectable()
  class Test {
    constructor(_param: number, _test: string) {}
  }

  it('should set name of metatype', () => {
    const type = mixin(Test);

    expect(type.name).to.not.eql('Test');
  });

  it('should not lost the design:paramtypes metadata', () => {
    const type = mixin(Test);
    const constructorParams = Reflect.getMetadata('design:paramtypes', type);

    expect(constructorParams[0]).to.be.eql(Number);
    expect(constructorParams[1]).to.be.eql(String);
  });
});
