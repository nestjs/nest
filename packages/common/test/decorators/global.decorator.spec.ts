import { expect } from 'chai';

import { GLOBAL_MODULE_METADATA } from '../../constants';
import { Global } from '../../index';

describe('@Global', () => {
  @Global()
  class Test {}

  it('should enrich metatype with GlobalModule metadata', () => {
    const isGlobal = Reflect.getMetadata(GLOBAL_MODULE_METADATA, Test);
    expect(isGlobal).to.be.true;
  });
});
