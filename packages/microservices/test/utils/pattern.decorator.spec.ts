import 'reflect-metadata';
import { expect } from 'chai';
import { PATTERN_METADATA } from '../../constants';
import { MessagePattern } from '../../utils/pattern.decorator';

describe('@MessagePattern', () => {
  const pattern = { role: 'test' };
  class TestComponent {
    @MessagePattern(pattern)
    public static test() {}
  }
  it(`should enhance method with ${PATTERN_METADATA} metadata`, () => {
    const metadata = Reflect.getMetadata(PATTERN_METADATA, TestComponent.test);
    expect(metadata).to.be.eql(pattern);
  });
});
