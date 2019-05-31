import { expect } from 'chai';
import { PATTERN_METADATA } from '../../constants';
import {
  GrpcMethod,
  GrpcMethodStreamingType,
  GrpcStreamCall,
  GrpcStreamMethod,
  MessagePattern,
} from '../../decorators/message-pattern.decorator';

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
    const metadata = Reflect.getMetadata(PATTERN_METADATA, svc.test);
    expect(metadata).to.be.eql({
      service: TestService.name,
      rpc: 'Test',
      streaming: GrpcMethodStreamingType.NO_STREAMING,
    });
  });

  it('should derive method', () => {
    const svc = new TestService();
    const metadata = Reflect.getMetadata(PATTERN_METADATA, svc.test2);
    expect(metadata).to.be.eql({
      service: 'TestService2',
      rpc: 'Test2',
      streaming: GrpcMethodStreamingType.NO_STREAMING,
    });
  });

  it('should override both method and service', () => {
    const svc = new TestService();
    const metadata = Reflect.getMetadata(PATTERN_METADATA, svc.test3);
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
    const metadata = Reflect.getMetadata(PATTERN_METADATA, svc.test);
    expect(metadata).to.be.eql({
      service: TestService.name,
      rpc: 'Test',
      streaming: GrpcMethodStreamingType.RX_STREAMING,
    });
  });

  it('should derive method', () => {
    const svc = new TestService();
    const metadata = Reflect.getMetadata(PATTERN_METADATA, svc.test2);
    expect(metadata).to.be.eql({
      service: 'TestService2',
      rpc: 'Test2',
      streaming: GrpcMethodStreamingType.RX_STREAMING,
    });
  });

  it('should override both method and service', () => {
    const svc = new TestService();
    const metadata = Reflect.getMetadata(PATTERN_METADATA, svc.test3);
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
    const metadata = Reflect.getMetadata(PATTERN_METADATA, svc.test);
    expect(metadata).to.be.eql({
      service: TestService.name,
      rpc: 'Test',
      streaming: GrpcMethodStreamingType.PT_STREAMING,
    });
  });

  it('should derive method', () => {
    const svc = new TestService();
    const metadata = Reflect.getMetadata(PATTERN_METADATA, svc.test2);
    expect(metadata).to.be.eql({
      service: 'TestService2',
      rpc: 'Test2',
      streaming: GrpcMethodStreamingType.PT_STREAMING,
    });
  });

  it('should override both method and service', () => {
    const svc = new TestService();
    const metadata = Reflect.getMetadata(PATTERN_METADATA, svc.test3);
    expect(metadata).to.be.eql({
      service: 'TestService2',
      rpc: 'Test2',
      streaming: GrpcMethodStreamingType.PT_STREAMING,
    });
  });
});
