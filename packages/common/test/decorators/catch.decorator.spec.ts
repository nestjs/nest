import { expect } from 'chai';
import { CATCH_WATERMARK, FILTER_CATCH_EXCEPTIONS } from '../../constants';
import { Catch } from '../../decorators/core/catch.decorator';

describe('@Catch', () => {
  const exceptions: any = ['exception', 'exception2'];

  @Catch(...exceptions)
  class Test {}

  it(`should enhance component with "${CATCH_WATERMARK}" metadata`, () => {
    const catchWatermark = Reflect.getMetadata(CATCH_WATERMARK, Test);

    expect(catchWatermark).to.be.true;
  });

  it('should enhance class with expected exceptions array', () => {
    const metadata = Reflect.getMetadata(FILTER_CATCH_EXCEPTIONS, Test);
    expect(metadata).to.be.eql(exceptions);
  });
});
