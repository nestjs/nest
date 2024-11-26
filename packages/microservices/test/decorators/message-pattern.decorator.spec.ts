import { expect } from 'chai';
import {
  PATTERN_EXTRAS_METADATA,
  PATTERN_METADATA,
  TRANSPORT_METADATA,
} from '../../constants';
import {
  GrpcMethod,
  GrpcMethodStreamingType,
  GrpcStreamCall,
  GrpcStreamMethod,
  MessagePattern,
} from '../../decorators/message-pattern.decorator';
import { Transport } from '../../enums/transport.enum';

describe('@MessagePattern', () => {
  const pattern = { role: 'test' };
  const extras = { param: 'value' };
  class TestComponent {
    @MessagePattern(pattern, undefined, extras)
    public static test() {}
  }
  it(`should enhance method with ${PATTERN_METADATA} metadata`, () => {
    const [metadata] = Reflect.getMetadata(
      PATTERN_METADATA,
      TestComponent.test,
    );
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
    const additionalExtras = { foo: 'bar' };

    class TestComponent1 {
      @MessagePattern(pattern)
      public static test() {}
    }
    class TestComponent2 {
      @MessagePattern(pattern, Transport.TCP)
      public static test() {}
    }
    class TestComponent3 {
      @MessagePattern(pattern, extras)
      public static test() {}
    }
    class TestComponent4 {
      @MessagePattern(pattern, Transport.TCP, extras)
      public static test() {}
    }
    class TestComponent5 {
      @MessagePattern(pattern, Transport.TCP, extras)
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

describe('@GrpcMethod', () => {
  class TestService {
    @GrpcMethod()
    public test() {}

    @GrpcMethod('TestService2')
    public test2() {}

    @GrpcMethod('TestService2', 'Test2')
    public test3() {}
  }

  it('should derive method and service name', () => {
    const svc = new TestService();
    const [metadata] = Reflect.getMetadata(PATTERN_METADATA, svc.test);
    expect(metadata).to.be.eql({
      service: TestService.name,
      rpc: 'Test',
      streaming: GrpcMethodStreamingType.NO_STREAMING,
    });
  });

  it('should derive method', () => {
    const svc = new TestService();
    const [metadata] = Reflect.getMetadata(PATTERN_METADATA, svc.test2);
    expect(metadata).to.be.eql({
      service: 'TestService2',
      rpc: 'Test2',
      streaming: GrpcMethodStreamingType.NO_STREAMING,
    });
  });

  it('should override both method and service', () => {
    const svc = new TestService();
    const [metadata] = Reflect.getMetadata(PATTERN_METADATA, svc.test3);
    expect(metadata).to.be.eql({
      service: 'TestService2',
      rpc: 'Test2',
      streaming: GrpcMethodStreamingType.NO_STREAMING,
    });
  });
});

describe('@GrpcStreamMethod', () => {
  class TestService {
    @GrpcStreamMethod()
    public test() {}

    @GrpcStreamMethod('TestService2')
    public test2() {}

    @GrpcStreamMethod('TestService2', 'Test2')
    public test3() {}
  }

  it('should derive method and service name', () => {
    const svc = new TestService();
    const [metadata] = Reflect.getMetadata(PATTERN_METADATA, svc.test);
    expect(metadata).to.be.eql({
      service: TestService.name,
      rpc: 'Test',
      streaming: GrpcMethodStreamingType.RX_STREAMING,
    });
  });

  it('should derive method', () => {
    const svc = new TestService();
    const [metadata] = Reflect.getMetadata(PATTERN_METADATA, svc.test2);
    expect(metadata).to.be.eql({
      service: 'TestService2',
      rpc: 'Test2',
      streaming: GrpcMethodStreamingType.RX_STREAMING,
    });
  });

  it('should override both method and service', () => {
    const svc = new TestService();
    const [metadata] = Reflect.getMetadata(PATTERN_METADATA, svc.test3);
    expect(metadata).to.be.eql({
      service: 'TestService2',
      rpc: 'Test2',
      streaming: GrpcMethodStreamingType.RX_STREAMING,
    });
  });
});

describe('@GrpcStreamCall', () => {
  class TestService {
    @GrpcStreamCall()
    public test() {}

    @GrpcStreamCall('TestService2')
    public test2() {}

    @GrpcStreamCall('TestService2', 'Test2')
    public test3() {}
  }

  it('should derive method and service name', () => {
    const svc = new TestService();
    const [metadata] = Reflect.getMetadata(PATTERN_METADATA, svc.test);
    expect(metadata).to.be.eql({
      service: TestService.name,
      rpc: 'Test',
      streaming: GrpcMethodStreamingType.PT_STREAMING,
    });
  });

  it('should derive method', () => {
    const svc = new TestService();
    const [metadata] = Reflect.getMetadata(PATTERN_METADATA, svc.test2);
    expect(metadata).to.be.eql({
      service: 'TestService2',
      rpc: 'Test2',
      streaming: GrpcMethodStreamingType.PT_STREAMING,
    });
  });

  it('should override both method and service', () => {
    const svc = new TestService();
    const [metadata] = Reflect.getMetadata(PATTERN_METADATA, svc.test3);
    expect(metadata).to.be.eql({
      service: 'TestService2',
      rpc: 'Test2',
      streaming: GrpcMethodStreamingType.PT_STREAMING,
    });
  });
});
