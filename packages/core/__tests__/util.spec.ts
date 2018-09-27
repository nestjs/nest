import { DeferredPromise, Utils } from '@nest/core';
import { MissingRequiredDependencyMessage } from '@nest/core/errors/messages';

describe('Utils', () => {
  let isFunctionSpy: jest.SpyInstance;
  let isObjectSpy: jest.SpyInstance;
  let isNilSpy: jest.SpyInstance;

  beforeEach(() => {
    isFunctionSpy = jest.spyOn(Utils, 'isFunction');
    isObjectSpy = jest.spyOn(Utils, 'isObject');
    isNilSpy = jest.spyOn(Utils, 'isNil');
  });

  afterEach(() => {
    isFunctionSpy.mockClear();
    isObjectSpy.mockClear();
    isNilSpy.mockClear();
  });

  describe('createDeferredPromise', () => {
    let deferred: DeferredPromise;

    beforeEach(() => {
      deferred = Utils.createDeferredPromise();
    });

    it('should create', () => {
      expect(deferred).toBeInstanceOf(Promise);

      expect(deferred.then).toBeInstanceOf(Function);
      expect(deferred.catch).toBeInstanceOf(Function);

      expect(deferred.resolve).toBeInstanceOf(Function);
      expect(deferred.reject).toBeInstanceOf(Function);
    });

    it('should resolve', async () => {
      const thenSpy = jest.spyOn(deferred, 'then');

      deferred.then(() => true);

      deferred.resolve();
      expect(thenSpy).toHaveBeenCalledTimes(1);

      await expect(deferred).resolves.toBeTruthy();
    });

    it('should reject', async () => {
      const catchSpy = jest.spyOn(deferred,'catch');

      deferred.catch(() => false);

      deferred.reject();
      expect(catchSpy).toHaveBeenCalledTimes(1);

      await expect(deferred).rejects.toBeFalsy();
    });
  });

  describe('loadPackage', () => {
    jest.mock('express', () => {});
    afterAll(() => jest.restoreAllMocks());

    it(`should throw MissingRequiredDependencyException if package doesn't exist`, async () => {
      const name = '@nestjs/core';

      const message = MissingRequiredDependencyMessage(name, '');

      await expect(
        Utils.loadPackage(name, ''),
      ).rejects.toThrow(message);
    });

    it('should load package if it exists', async () => {
      const express = require('express');

      await expect(
        Utils.loadPackage('express', '')
      ).resolves.toStrictEqual(express);
    });
  });

  describe('isNamedFunction', () => {
    it('should be truthy with a named function', () => {
      function nest() {}

      expect(Utils.isNamedFunction(nest)).toBeTruthy();
      expect(isNilSpy).toHaveBeenCalledWith(nest.name);
      expect(isFunctionSpy).toHaveBeenCalledWith(nest);
    });

    it('should be falsy with an anonymous function', () => {
      const nest = () => {};

      expect(Utils.isNamedFunction(nest)).toBeFalsy();
      expect(isNilSpy).toHaveBeenCalledWith(undefined);
      expect(isFunctionSpy).toHaveBeenCalledWith(nest);
    });

    it('should be truthy with a class', () => {
      class Nest {}

      expect(Utils.isNamedFunction(Nest)).toBeTruthy();
      expect(isNilSpy).toHaveBeenCalledWith(Nest.name);
      expect(isFunctionSpy).toHaveBeenCalledWith(Nest);
    });
  });
});
