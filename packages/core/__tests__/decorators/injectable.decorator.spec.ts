import 'reflect-metadata';
import { Injectable, PROVIDER_METADATA, Reflector } from '@nest/core';

describe('Injectable()', () => {
  it('should define metadata on class as injectable', () => {
    @Injectable()
    class Test {}

    const metadata = Reflector.get(PROVIDER_METADATA, Test);
    expect(metadata).toBeTruthy();
  });
});
