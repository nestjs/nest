import {
  CanActivate,
  ForbiddenException,
  Inject,
  INestApplication,
  Injectable,
  Module,
  Provider,
  Scope,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ENTRY_PROVIDER_WATERMARK } from '@nestjs/common/constants';
import { APP_GUARD, ContextIdFactory, ModulesContainer } from '@nestjs/core';
import { ExternalContextCreator } from '@nestjs/core/helpers/external-context-creator';
import { Injector } from '@nestjs/core/injector/injector';
import { Test, TestingModule } from '@nestjs/testing';
import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { expect } from 'chai';
import { io } from 'socket.io-client';

@Injectable()
class DenyGuard implements CanActivate {
  canActivate() {
    return false;
  }
}

@Injectable({ scope: Scope.REQUEST })
class RequestScopedDenyGuard implements CanActivate {
  canActivate() {
    return false;
  }
}

@Injectable({ scope: Scope.REQUEST })
class RequestScopedAllowGuard implements CanActivate {
  canActivate() {
    return true;
  }
}

@WebSocketGateway()
class VaultGateway {
  @UseGuards(DenyGuard)
  @SubscribeMessage('open')
  open() {
    return { event: 'open', data: 'granted' };
  }
}

@WebSocketGateway()
class RequestScopedVaultGateway {
  @UseGuards(RequestScopedDenyGuard)
  @SubscribeMessage('open')
  open() {
    return { event: 'open', data: 'granted' };
  }
}

// Marked the way `@Resolver()` of @nestjs/graphql marks a resolver.
@SetMetadata(ENTRY_PROVIDER_WATERMARK, true)
class PayrollResolver {
  payroll() {
    return 'payroll';
  }
}

const IS_ALLOWED = 'IS_ALLOWED';

@Injectable()
class ConfiguredGuard implements CanActivate {
  constructor(@Inject(IS_ALLOWED) private readonly isAllowed: boolean) {}

  canActivate() {
    return this.isAllowed;
  }
}

@SetMetadata(ENTRY_PROVIDER_WATERMARK, true)
class OrdersResolver {
  @UseGuards(ConfiguredGuard)
  orders() {
    return 'orders';
  }
}

@Module({
  providers: [OrdersResolver, { provide: IS_ALLOWED, useValue: true }],
})
class PartnerModule {}

@Module({
  providers: [OrdersResolver, { provide: IS_ALLOWED, useValue: false }],
})
class AdminModule {}

const rejectionOf = async (promise: Promise<unknown>) =>
  promise.then(
    () => undefined,
    (err: unknown) => err,
  );

describe('Class providers that host handlers', () => {
  describe('when a gateway is registered with "useClass"', () => {
    let app: INestApplication;

    afterEach(async () => {
      await app.close();
    });

    const sendOpen = async (provider: Provider) => {
      const moduleRef = await Test.createTestingModule({
        providers: [provider],
      }).compile();
      app = moduleRef.createNestApplication({ logger: false });
      await app.listen(0, '127.0.0.1');

      const client = io(await app.getUrl(), { transports: ['websocket'] });
      const reply = new Promise<{ event: string; data: any }>(resolve => {
        client.once('exception', data => resolve({ event: 'exception', data }));
        client.once('open', data => resolve({ event: 'open', data }));
      });
      client.emit('open', {});
      try {
        return await reply;
      } finally {
        client.close();
      }
    };

    const cases: [string, Provider][] = [
      ['its class', { provide: VaultGateway, useClass: VaultGateway }],
      ['another token', { provide: 'VAULT', useClass: VaultGateway }],
      [
        'another token and a request-scoped guard',
        { provide: 'VAULT', useClass: RequestScopedVaultGateway },
      ],
    ];
    cases.forEach(([description, provider]) => {
      it(`should run its guards when it is provided under ${description}`, async () => {
        const { event, data } = await sendOpen(provider);

        expect(event).to.equal('exception');
        expect(data.message).to.equal('Forbidden resource');
      });
    });
  });

  describe('when a resolver is registered with "useClass" under another token', () => {
    it('should run a request-scoped global guard on it', async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [
          { provide: 'PAYROLL', useClass: PayrollResolver },
          { provide: APP_GUARD, useClass: RequestScopedDenyGuard },
        ],
      }).compile();
      const hostModule = [...moduleRef.get(ModulesContainer).values()].find(
        ({ providers }) => providers.has('PAYROLL'),
      )!;
      const wrapper = hostModule.providers.get('PAYROLL')!;

      // What @nestjs/graphql does for a resolver that is not static
      expect(wrapper.isDependencyTreeStatic()).to.be.false;
      const contextId = ContextIdFactory.create();
      moduleRef.registerRequestByContextId({}, contextId);
      const resolver = await new Injector().loadPerContext(
        wrapper.instance as PayrollResolver,
        hostModule,
        hostModule.providers,
        contextId,
      );
      const handler = moduleRef
        .get(ExternalContextCreator)
        .create(
          resolver,
          resolver.payroll,
          'payroll',
          undefined,
          undefined,
          contextId,
          wrapper.id,
        );

      let error: unknown;
      try {
        await handler();
      } catch (err) {
        error = err;
      }
      expect(error).to.be.instanceOf(ForbiddenException);
      await moduleRef.close();
    });
  });

  describe('when two modules provide the class of a resolver', () => {
    let moduleRef: TestingModule;

    afterEach(async () => {
      await moduleRef.close();
    });

    const compile = async (providers: Provider[] = []) => {
      moduleRef = await Test.createTestingModule({
        imports: [PartnerModule, AdminModule],
        providers,
      }).compile();
      const adminModule = [...moduleRef.get(ModulesContainer).values()].find(
        ({ metatype }) => metatype === AdminModule,
      )!;
      return {
        adminModule,
        wrapper: adminModule.providers.get(OrdersResolver)!,
      };
    };

    it('should run the guards of the module of the host', async () => {
      const { wrapper } = await compile();
      const resolver = wrapper.instance as OrdersResolver;
      const handler = moduleRef
        .get(ExternalContextCreator)
        .create(resolver, resolver.orders, 'orders');

      expect(await rejectionOf(handler())).to.be.instanceOf(ForbiddenException);
    });

    it('should run the guards of the module of the host when it is request-scoped', async () => {
      const { adminModule, wrapper } = await compile([
        { provide: APP_GUARD, useClass: RequestScopedAllowGuard },
      ]);
      expect(wrapper.isDependencyTreeStatic()).to.be.false;
      const contextId = ContextIdFactory.create();
      moduleRef.registerRequestByContextId({}, contextId);
      const resolver = await new Injector().loadPerContext(
        wrapper.instance as OrdersResolver,
        adminModule,
        adminModule.providers,
        contextId,
      );
      const handler = moduleRef
        .get(ExternalContextCreator)
        .create(
          resolver,
          resolver.orders,
          'orders',
          undefined,
          undefined,
          contextId,
          wrapper.id,
        );

      expect(await rejectionOf(handler())).to.be.instanceOf(ForbiddenException);
    });
  });
});
