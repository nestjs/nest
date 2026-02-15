import {
  PATTERN_EXTRAS_METADATA,
  PATTERN_METADATA,
  TRANSPORT_METADATA,
} from '../../constants.js';
import { EventPattern } from '../../decorators/event-pattern.decorator.js';
import { Transport } from '../../enums/transport.enum.js';

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
    expect(metadata.length).toBe(1);
    expect(metadata[0]).toEqual(pattern);
  });
  it(`should enhance method with ${PATTERN_EXTRAS_METADATA} metadata`, () => {
    const metadata = Reflect.getMetadata(
      PATTERN_EXTRAS_METADATA,
      TestComponent.test,
    );
    expect(metadata).toEqual(extras);
  });
  it(`should enhance method with last ${PATTERN_METADATA} metadata`, () => {
    const metadata = Reflect.getMetadata(
      PATTERN_METADATA,
      TestComponent.testOnlyThird,
    );
    expect(metadata.length).toBe(1);
    expect(metadata[0]).toEqual(patternSecond);
  });
  it(`should enhance method with both ${PATTERN_METADATA} metadata`, () => {
    const metadata = Reflect.getMetadata(
      PATTERN_METADATA,
      TestComponent.testBoth,
    );
    expect(metadata.length).toBe(2);
    expect(metadata[0]).toEqual(patternSecond);
    expect(metadata[1]).toEqual(patternThird);
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
            descriptor.value!,
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
      expect(metadataArg).toEqual(pattern);
      expect(transportArg).toBeUndefined();
      expect(extrasArg).toEqual({});
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
      expect(metadataArg).toEqual(pattern);
      expect(transportArg).toEqual(Transport.TCP);
      expect(extrasArg).toEqual({});
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
      expect(metadataArg).toEqual(pattern);
      expect(transportArg).toBeUndefined();
      expect(extrasArg).toEqual(extras);
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
      expect(metadataArg).toEqual(pattern);
      expect(transportArg).toEqual(Transport.TCP);
      expect(extrasArg).toEqual(extras);
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
      expect(metadataArg).toEqual(pattern);
      expect(transportArg).toEqual(Transport.TCP);
      expect(extrasArg).toEqual({
        ...additionalExtras,
        ...extras,
      });
    });
  });
});
