import { expect } from 'chai';
import { Aspect, Decorator, LazyDecorator } from '../../aop';
import { Reflector } from '../../services';
import { Controller, Logger, SetMetadata } from '@nestjs/common';
import { Module as ModuleDecorator } from '../../../common/decorators/modules/module.decorator';
import { DiscoveryService } from '../../discovery';
import { AutoAspectExecutor } from '../../aop/auto-aspect-executor';
import { ModulesContainer } from '../../injector';
import { MetadataScanner } from '../../metadata-scanner';
import * as sinon from 'sinon';
import { InstanceWrapper } from '../../injector/instance-wrapper';

describe('AutoAspectExecutor', () => {
  const key = 'logging';
  const Log = () => SetMetadata('logging', true);

  @Aspect()
  class LogLazyDecorator implements LazyDecorator {
    constructor(private readonly logger: Logger) {}

    wrap(
      reflector: Reflector,
      instance: any,
      methodName: string,
    ): Decorator | undefined {
      const methodRef = instance[methodName];

      const shouldWrap = reflector.get(key, methodRef);

      if (!shouldWrap) {
        return;
      }

      return (...args: any[]) => {
        this.logger.log(`${methodName} <= ${args}`);

        const result = methodRef.call(instance, ...args);

        this.logger.log(`${methodName} => ${result}`);

        return result;
      };
    }
  }

  @ModuleDecorator({})
  class TestModule {}

  class TestService {
    @Log()
    hello(name: string) {
      return `hello ${name}`;
    }
  }

  @Controller()
  class TestController {
    @Log()
    hello(name: string) {
      return `hello ${name}`;
    }
  }

  it('should called log method', async () => {
    const logger = new Logger();
    const logSpy = sinon.spy(logger, 'log');

    const logLazyDecorator = new LogLazyDecorator(logger);
    const testController = new TestController();

    const testService = new TestService();
    const discoveryService = new DiscoveryService(new ModulesContainer());

    const getProvidersStub = sinon.stub(discoveryService, 'getProviders');
    const getControllersStub = sinon.stub(discoveryService, 'getControllers');

    getProvidersStub.returns([
      new InstanceWrapper({
        instance: testService,
        metatype: TestService,
      }),
      new InstanceWrapper({
        instance: logLazyDecorator,
        metatype: LogLazyDecorator,
      }),
    ]);
    const autoAspectExecutor = new AutoAspectExecutor(
      discoveryService,
      new MetadataScanner(),
      new Reflector(),
    );

    getControllersStub.returns([
      new InstanceWrapper({
        instance: testController,
        metatype: TestController,
      }),
    ]);

    autoAspectExecutor.onModuleInit();

    testService.hello('kys');
    expect(logSpy.calledTwice).to.be.true;

    logSpy.resetHistory();

    testController.hello('kys');
    expect(logSpy.calledTwice).to.be.true;
  });
});
