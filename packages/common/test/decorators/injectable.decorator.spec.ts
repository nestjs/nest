import {
  SCOPE_OPTIONS_METADATA,
  INJECTABLE_WATERMARK,
} from '../../constants.js';
import { Injectable, mixin } from '../../index.js';

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

    expect(injectableWatermark).toEqual(true);
  });

  it('should enhance component with "design:paramtypes" metadata', () => {
    const constructorParams = Reflect.getMetadata(
      'design:paramtypes',
      TestMiddleware,
    );

    expect(constructorParams[0]).toEqual(Number);
    expect(constructorParams[1]).toEqual(String);
  });

  it(`should enhance component with "${SCOPE_OPTIONS_METADATA}" metadata`, () => {
    const constructorParams = Reflect.getMetadata(
      SCOPE_OPTIONS_METADATA,
      TestMiddleware,
    );

    expect(constructorParams).toEqual(options);
  });
});

describe('mixin', () => {
  @Injectable()
  class Test {
    constructor(_param: number, _test: string) {}
  }

  it('should set name of metatype', () => {
    const type = mixin(Test);

    expect(type.name).not.toEqual('Test');
  });

  it('should not lost the design:paramtypes metadata', () => {
    const type = mixin(Test);
    const constructorParams = Reflect.getMetadata('design:paramtypes', type);

    expect(constructorParams[0]).toEqual(Number);
    expect(constructorParams[1]).toEqual(String);
  });
});
