import { expect } from 'chai';
import { SCOPE_OPTIONS_METADATA, INJECTABLE_WATERMARK } from '../../constants';
import { Injectable, mixin, Scope } from '../../index';

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

  it('should mark the metatype as injectable', () => {
    class Undecorated {}
    const type = mixin(Undecorated);

    expect(Reflect.getMetadata(INJECTABLE_WATERMARK, type)).to.equal(true);
    expect(Reflect.getMetadata(SCOPE_OPTIONS_METADATA, type)).to.be.undefined;
  });

  it('should keep the scope options of the metatype', () => {
    const options = { scope: Scope.REQUEST, durable: true };

    @Injectable(options)
    class RequestScoped {}
    const type = mixin(RequestScoped);

    expect(Reflect.getMetadata(SCOPE_OPTIONS_METADATA, type)).to.deep.equal(
      options,
    );
  });

  it('should not hide the scope options of a parent class', () => {
    const options = { scope: Scope.TRANSIENT };

    @Injectable(options)
    class Transient {}
    class Child extends Transient {}
    const type = mixin(Child);

    expect(Reflect.getMetadata(SCOPE_OPTIONS_METADATA, type)).to.deep.equal(
      options,
    );
  });
});
