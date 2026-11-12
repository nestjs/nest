import {
  SCOPE_OPTIONS_METADATA,
  INJECTABLE_WATERMARK,
} from '../../constants.js';
import { Injectable, mixin, Scope } from '../../index.js';

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

  it('should not hide the design:paramtypes metadata of a parent class', () => {
    class Child extends Test {}
    const type = mixin(Child);
    const constructorParams = Reflect.getMetadata('design:paramtypes', type);

    expect(constructorParams).toEqual([Number, String]);
  });

  it('should declare no parameter types for an undecorated class', () => {
    class Undecorated {
      constructor(public options?: unknown) {}
    }
    const type = mixin(Undecorated);

    expect(Reflect.getMetadata('design:paramtypes', type)).toEqual([]);
  });

  it('should mark the metatype as injectable', () => {
    class Undecorated {}
    const type = mixin(Undecorated);

    expect(Reflect.getMetadata(INJECTABLE_WATERMARK, type)).toEqual(true);
    expect(Reflect.getMetadata(SCOPE_OPTIONS_METADATA, type)).toBeUndefined();
  });

  it('should keep the scope options of the metatype', () => {
    const options = { scope: Scope.REQUEST, durable: true };

    @Injectable(options)
    class RequestScoped {}
    const type = mixin(RequestScoped);

    expect(Reflect.getMetadata(SCOPE_OPTIONS_METADATA, type)).toEqual(options);
  });

  it('should not hide the scope options of a parent class', () => {
    const options = { scope: Scope.TRANSIENT };

    @Injectable(options)
    class Transient {}
    class Child extends Transient {}
    const type = mixin(Child);

    expect(Reflect.getMetadata(SCOPE_OPTIONS_METADATA, type)).toEqual(options);
  });
});
