import { expect } from 'chai';
import 'reflect-metadata';
import { FILTER_CATCH_EXCEPTIONS } from '../../constants';
import { Catch } from '../../decorators/core/catch.decorator';
import { InvalidDecoratorItemException } from '../../utils/validate-each.util';

describe('@Catch', () => {
  const exceptions: any = ['exception', 'exception2'];

  @Catch(...exceptions)
  class Test {}

  it('should enhance class with expected exceptions array', () => {
    const metadata = Reflect.getMetadata(FILTER_CATCH_EXCEPTIONS, Test);
    expect(metadata).to.be.eql(exceptions);
  });

  describe('when one item is nil', () => {
    it('should throw an exception', () => {
      try {
        Catch(null)(Test);
      }
      catch (err) {
        expect(err).to.be.instanceof(InvalidDecoratorItemException);
      }
    });
  });
});
