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
  const patternSecond = { role: 'test2' };
  const patternThird = { role: 'test3' };
  const extras = { param: 'value' };
  class TestComponent {
    @EventPattern(pattern, undefined, extras)
    public static test() {}

    @EventPattern(patternSecond, undefined, extras)
    @EventPattern(patternThird, undefined, extras)
    public static testOnlyThird() {}

    @EventPattern([patternSecond, patternThird], undefined, extras)
    public static testBoth() {}
  }
  it(`should enhance method with ${PATTERN_METADATA} metadata`, () => {
    const metadata = Reflect.getMetadata(PATTERN_METADATA, TestComponent.test);
    expect(metadata.length).to.equal(1);
    expect(metadata[0]).to.be.eql(pattern);
  });
  it(`should enhance method with ${PATTERN_EXTRAS_METADATA} metadata`, () => {
    const metadata = Reflect.getMetadata(
      PATTERN_EXTRAS_METADATA,
      TestComponent.test,
    );
    expect(metadata).to.be.deep.equal(extras);
  });
  it(`should enhance method with last ${PATTERN_METADATA} metadata`, () => {
    const metadata = Reflect.getMetadata(
      PATTERN_METADATA,
      TestComponent.testOnlyThird,
    );
    expect(metadata.length).to.equal(1);
    expect(metadata[0]).to.be.eql(patternSecond);
  });
  it(`should enhance method with both ${PATTERN_METADATA} metadata`, () => {
    const metadata = Reflect.getMetadata(
      PATTERN_METADATA,
      TestComponent.testBoth,
    );
    expect(metadata.length).to.equal(2);
    expect(metadata[0]).to.be.eql(patternSecond);
    expect(metadata[1]).to.be.eql(patternThird);
  });

  describe('decorator overloads', () => {
    const additionalExtras = { foo: 'bar' };

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
    class TestComponent5 {
      @EventPattern(pattern, Transport.TCP, extras)
      @((
        (): MethodDecorator => (_target, _key, descriptor) =>
          Reflect.defineMetadata(
            PATTERN_EXTRAS_METADATA,
            additionalExtras,
            descriptor.value,
          )
      )())
      public static test() {}
    }

    it(`should enhance method with ${PATTERN_METADATA} metadata`, () => {
      const [metadataArg] = Reflect.getMetadata(
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
      expect(extrasArg).to.be.eql({});
    });

    it(`should enhance method with ${PATTERN_METADATA}, ${TRANSPORT_METADATA} metadata`, () => {
      const [metadataArg] = Reflect.getMetadata(
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
      expect(extrasArg).to.be.eql({});
    });

    it(`should enhance method with ${PATTERN_METADATA}, ${PATTERN_EXTRAS_METADATA} metadata`, () => {
      const [metadataArg] = Reflect.getMetadata(
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
      const [metadataArg] = Reflect.getMetadata(
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

    it(`should merge with existing ${PATTERN_EXTRAS_METADATA} metadata`, () => {
      const [metadataArg] = Reflect.getMetadata(
        PATTERN_METADATA,
        TestComponent5.test,
      );
      const transportArg = Reflect.getMetadata(
        TRANSPORT_METADATA,
        TestComponent5.test,
      );
      const extrasArg = Reflect.getMetadata(
        PATTERN_EXTRAS_METADATA,
        TestComponent5.test,
      );
      expect(metadataArg).to.be.eql(pattern);
      expect(transportArg).to.be.eql(Transport.TCP);
      expect(extrasArg).to.be.eql({
        ...additionalExtras,
        ...extras,
      });
    });
  });
});
