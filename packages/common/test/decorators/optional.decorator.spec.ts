import { expect } from 'chai';
import {
  OPTIONAL_DEPS_METADATA,
  OPTIONAL_PROPERTY_DEPS_METADATA,
} from '../../constants';
import { Optional } from '../../index';

describe('@Optional', () => {
  class Test {
    constructor(@Optional() param1, @Optional() param2) {}
  }

  class PropertyTest {
    @Optional() property1: string;
    @Optional() property2: number;
  }

  it('should enhance class with expected constructor params metadata', () => {
    const metadata = Reflect.getMetadata(OPTIONAL_DEPS_METADATA, Test);
    expect(metadata).to.be.eql([1, 0]);
  });

  it('should enhance class with expected property metadata', () => {
    const metadata = Reflect.getMetadata(
      OPTIONAL_PROPERTY_DEPS_METADATA,
      PropertyTest,
    );
    expect(metadata).to.be.eql(['property1', 'property2']);
  });
});
