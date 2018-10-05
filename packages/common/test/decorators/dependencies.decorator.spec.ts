import { expect } from 'chai';
import { Dependencies } from '../../decorators/core/dependencies.decorator';
import { PARAMTYPES_METADATA } from '../../constants';

describe('@Dependencies', () => {
  const dep = 'test',
    dep2 = 'test2';
  const deps = [dep, dep2];

  @Dependencies(deps)
  class Test {}
  @Dependencies(dep, dep2)
  class Test2 {}

  it('should enhance class with expected dependencies array', () => {
    const metadata = Reflect.getMetadata(PARAMTYPES_METADATA, Test);
    expect(metadata).to.be.eql(deps);
  });

  it('should makes passed array flatten', () => {
    const metadata = Reflect.getMetadata(PARAMTYPES_METADATA, Test2);
    expect(metadata).to.be.eql([dep, dep2]);
  });
});
