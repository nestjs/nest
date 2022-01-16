import { expect } from 'chai';
import { PATTERN_METADATA, PATTERN_EXTRAS_METADATA } from '../../constants';
import { EventPattern } from '../../decorators/event-pattern.decorator';

describe('@EventPattern', () => {
  const pattern = { role: 'test' };
  const extras = { param: 'value' };
  class TestComponent {
    @EventPattern(pattern, undefined, extras)
    public static test() {}
  }
  it(`should enhance method with ${PATTERN_METADATA} metadata`, () => {
    const metadata = Reflect.getMetadata(PATTERN_METADATA, TestComponent.test);
    expect(metadata).to.be.eql(pattern);
  });
  it(`should enhance method with ${PATTERN_EXTRAS_METADATA} metadata`, () => {
    const metadata = Reflect.getMetadata(
      PATTERN_EXTRAS_METADATA,
      TestComponent.test,
    );
    expect(metadata).to.be.deep.equal(extras);
  });
});
