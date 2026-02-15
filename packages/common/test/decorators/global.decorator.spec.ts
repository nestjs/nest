import { GLOBAL_MODULE_METADATA } from '../../constants.js';
import { Global } from '../../index.js';

describe('@Global', () => {
  @Global()
  class Test {}

  it('should enrich metatype with GlobalModule metadata', () => {
    const isGlobal = Reflect.getMetadata(GLOBAL_MODULE_METADATA, Test);
    expect(isGlobal).toBe(true);
  });
});
