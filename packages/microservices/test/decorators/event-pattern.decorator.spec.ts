import { expect } from 'chai';
import {
  PATTERN_EXTRAS_METADATA,
  PATTERN_METADATA,
  TRANSPORT_METADATA,
} from '../../constants';
import { Transport } from '../../enums/transport.enum';
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

  describe('decorator overloads', () => {
    class TestComponent1 {
      @EventPattern(pattern)
      public static test() {}
    }
    class TestComponent2 {
      @EventPattern(pattern, Transport.TCP)
      public static test() {}
    }
    class TestComponent3 {
      @EventPattern(pattern, extras)
      public static test() {}
    }
    class TestComponent4 {
      @EventPattern(pattern, Transport.TCP, extras)
      public static test() {}
    }

    it(`should enhance method with ${PATTERN_METADATA} metadata`, () => {
      const metadataArg = Reflect.getMetadata(
        PATTERN_METADATA,
        TestComponent1.test,
      );
      const transportArg = Reflect.getMetadata(
        TRANSPORT_METADATA,
        TestComponent1.test,
      );
      const extrasArg = Reflect.getMetadata(
        PATTERN_EXTRAS_METADATA,
        TestComponent1.test,
      );
      expect(metadataArg).to.be.eql(pattern);
      expect(transportArg).to.be.undefined;
      expect(extrasArg).to.be.undefined;
    });

    it(`should enhance method with ${PATTERN_METADATA}, ${TRANSPORT_METADATA} metadata`, () => {
      const metadataArg = Reflect.getMetadata(
        PATTERN_METADATA,
        TestComponent2.test,
      );
      const transportArg = Reflect.getMetadata(
        TRANSPORT_METADATA,
        TestComponent2.test,
      );
      const extrasArg = Reflect.getMetadata(
        PATTERN_EXTRAS_METADATA,
        TestComponent2.test,
      );
      expect(metadataArg).to.be.eql(pattern);
      expect(transportArg).to.be.eql(Transport.TCP);
      expect(extrasArg).to.be.undefined;
    });

    it(`should enhance method with ${PATTERN_METADATA}, ${PATTERN_EXTRAS_METADATA} metadata`, () => {
      const metadataArg = Reflect.getMetadata(
        PATTERN_METADATA,
        TestComponent3.test,
      );
      const transportArg = Reflect.getMetadata(
        TRANSPORT_METADATA,
        TestComponent3.test,
      );
      const extrasArg = Reflect.getMetadata(
        PATTERN_EXTRAS_METADATA,
        TestComponent3.test,
      );
      expect(metadataArg).to.be.eql(pattern);
      expect(transportArg).to.be.undefined;
      expect(extrasArg).to.be.eql(extras);
    });

    it(`should enhance method with ${PATTERN_METADATA}, ${TRANSPORT_METADATA} and \
${PATTERN_EXTRAS_METADATA} metadata`, () => {
      const metadataArg = Reflect.getMetadata(
        PATTERN_METADATA,
        TestComponent4.test,
      );
      const transportArg = Reflect.getMetadata(
        TRANSPORT_METADATA,
        TestComponent4.test,
      );
      const extrasArg = Reflect.getMetadata(
        PATTERN_EXTRAS_METADATA,
        TestComponent4.test,
      );
      expect(metadataArg).to.be.eql(pattern);
      expect(transportArg).to.be.eql(Transport.TCP);
      expect(extrasArg).to.be.eql(extras);
    });
  });
});
