import 'reflect-metadata';
import {
  Module,
  Injectable,
  InjectionToken,
  Registry,
  forwardRef,
  Inject,
  ProvideToken,
} from '@nest/core';

describe('Registry', () => {
  beforeEach(() => Registry.clearLazyInjects());

  describe('getLazyInjects', () => {
    it('should get lazy injects', () => {
      const ref = forwardRef(() => Nest);

      @Injectable()
      class Nest {
        @Inject(ref)
        private readonly nest: Nest;
      }

      const lazyInjects = Registry.getLazyInjects(Nest);
      expect(lazyInjects).toHaveLength(1);
      expect(lazyInjects[0]).toHaveProperty('target', Nest);
      expect(lazyInjects[0]).toHaveProperty('lazyInject');
      expect(lazyInjects[0]).toHaveProperty('forwardRef');
    });
  });

  describe('hasForwardRef', () => {
    const forwardRef = () => {};

    it('should have forwardRef', () => {
      expect(Registry.hasForwardRef({
        forwardRef,
      })).toBeTruthy();
    });

    it('should not have forwardRef', () => {
      expect(Registry.hasForwardRef(forwardRef)).toBeFalsy();
    });
  });

  describe('getForwardRef', () => {
    it('should get provider', () => {
      @Injectable()
      class Nest {}

      const ref = forwardRef(() => Nest);
      expect(Registry.getForwardRef(ref)).toEqual(Nest);
      expect(Registry.getForwardRef(Nest)).toEqual(Nest);
    });
  });

  describe('getProviderToken', () => {
    let spy: jest.SpyInstance;

    beforeEach(() => {
      spy = jest.spyOn(Registry, 'getInjectionToken');
    });

    afterEach(() => {
      // spy.mockRestore();
      spy.mockClear();
    });

    it('should get token from Injectable', () => {
      @Injectable()
      class Nest {}

      const token = Registry.getProviderToken(Nest);

      expect(token).toEqual(Nest);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(Nest);
    });

    it('should get token from ProvideToken', () => {
      const NEST = new InjectionToken<void>('NEST');

      const provider: ProvideToken = {
        provide: NEST,
      };

      const token = Registry.getProviderToken(provider);

      expect(token).toEqual(NEST.name);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(NEST);
    });
  });

  describe('getProviderName', () => {
    let spy: jest.SpyInstance;

    beforeEach(() => {
      spy = jest.spyOn(Registry, 'getProviderToken');
    });

    afterEach(() => {
      // spy.mockRestore();
      spy.mockClear();
    });

    it('should get name from InjectionToken', () => {
      const token = new InjectionToken<void>('token');
      const name = Registry.getProviderName(token);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(token);
      expect(token.name.toString()).toEqual(name);
    });

    it('should get name from Injectable', () => {
      class Nest {}
      const name = Registry.getProviderName(Nest);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(Nest);
      expect(Nest.name).toEqual(name);
    });
  });

  describe('isModule', () => {
    @Module()
    class NestModule {}

    it('should succeed with @Module() decorated', () => {
      expect(Registry.isModule(NestModule)).toBeTruthy();
    });

    it('should succeed with DynamicModule', () => {
      expect(Registry.isModule({
        module: NestModule,
      })).toBeTruthy();
    });

    it('should fail with ProvideToken', () => {
      const NEST = new InjectionToken<void>('NEST');

      expect(Registry.isModule({
        provide: NEST,
      })).toBeFalsy();
    });

    it('should fail with Injectable', () => {
      @Injectable()
      class Nest {}

      expect(Registry.isModule(Nest)).toBeFalsy();
    });

    it('should fail with InjectionToken', () => {
      const NEST = new InjectionToken<void>('NEST');

      expect(Registry.isModule(NEST)).toBeFalsy();
    });
  });
});
