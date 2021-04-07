import { expect } from 'chai';

import { EXCEPTION_FILTERS_METADATA } from '../../constants';
import { UseFilters } from '../../decorators/core/exception-filters.decorator';
import { InvalidDecoratorItemException } from '../../utils/validate-each.util';

class Filter {
  catch() {}
}

describe('@UseFilters', () => {
  const filters = [new Filter(), new Filter()];

  @UseFilters(...(filters as any))
  class Test {}

  class TestWithMethod {
    @UseFilters(...(filters as any))
    public static test() {}
  }

  it('should enhance class with expected exception filters array', () => {
    const metadata = Reflect.getMetadata(EXCEPTION_FILTERS_METADATA, Test);
    expect(metadata).to.be.eql(filters);
  });

  it('should enhance method with expected exception filters array', () => {
    const metadata = Reflect.getMetadata(
      EXCEPTION_FILTERS_METADATA,
      TestWithMethod.test,
    );
    expect(metadata).to.be.eql(filters);
  });

  it('when object is invalid should throw exception', () => {
    try {
      UseFilters('test' as any)(() => {});
    } catch (e) {
      expect(e).to.be.instanceof(InvalidDecoratorItemException);
    }
  });
});
