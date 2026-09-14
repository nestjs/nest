import {
  Dependencies,
  flatten,
} from '../../decorators/core/dependencies.decorator.js';
import { PARAMTYPES_METADATA } from '../../constants.js';

describe('@Dependencies', () => {
  const dep = 'test',
    dep2 = 'test2',
    dep3 = 'test3';
  const deps = [dep, dep2];

  @Dependencies(deps)
  class Test {}
  @Dependencies(dep, dep2)
  class Test2 {}
  @Dependencies([dep, [dep2, [dep3]]])
  class Test3 {}

  it('should enhance class with expected dependencies array', () => {
    const metadata = Reflect.getMetadata(PARAMTYPES_METADATA, Test);
    expect(metadata).toEqual(deps);
  });

  it('should makes passed array flatten', () => {
    const metadata = Reflect.getMetadata(PARAMTYPES_METADATA, Test2);
    expect(metadata).toEqual([dep, dep2]);
  });

  it('should flatten deeply nested dependency arrays', () => {
    const metadata = Reflect.getMetadata(PARAMTYPES_METADATA, Test3);
    expect(metadata).toEqual([dep, dep2, dep3]);
  });
});

describe('flatten', () => {
  it('should flatten arrays nested at any depth', () => {
    expect(flatten([1, [2, [3, [4]]]])).toEqual([1, 2, 3, 4]);
  });
});
