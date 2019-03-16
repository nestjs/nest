import { expect } from 'chai';
import { PATTERN_METADATA } from '../../constants';
import { EventPattern } from '../../decorators/event-pattern.decorator';

describe('@EventPattern', () => {
  const pattern = { role: 'test' };
  class TestComponent {
    @EventPattern(pattern)
    public static test() {}
  }
  it(`should enhance method with ${PATTERN_METADATA} metadata`, () => {
    const metadata = Reflect.getMetadata(PATTERN_METADATA, TestComponent.test);
    expect(metadata).to.be.eql(pattern);
  });
});
