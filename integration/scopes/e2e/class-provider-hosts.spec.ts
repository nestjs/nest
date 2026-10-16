import {
  CanActivate,
  ForbiddenException,
  INestApplication,
  Injectable,
  Provider,
  Scope,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ENTRY_PROVIDER_WATERMARK } from '@nestjs/common/constants.js';
import { APP_GUARD, ContextIdFactory, ModulesContainer } from '@nestjs/core';
import { ExternalContextCreator } from '@nestjs/core/helpers/external-context-creator.js';
import { Injector } from '@nestjs/core/injector/injector.js';
import { WsAdapter } from '@nestjs/platform-ws';
import { Test, TestingModule } from '@nestjs/testing';
import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import WebSocket from 'ws';

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

@Injectable({ scope: Scope.TRANSIENT })
class TransientDenyGuard implements CanActivate {
  canActivate() {
    return false;
  }
}

@WebSocketGateway({ path: '/vault' })
class VaultGateway {
  @UseGuards(DenyGuard)
  @SubscribeMessage('open')
  open() {
    return { event: 'open', data: 'granted' };
  }
}

@WebSocketGateway({ path: '/vault' })
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

  @UseGuards(DenyGuard)
  secret() {
    return 'secret';
  }
}

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
      app.useWebSocketAdapter(new WsAdapter(app));
      await app.listen(0, '127.0.0.1');

      const client = new WebSocket(
        `${(await app.getUrl()).replace('http', 'ws')}/vault`,
      );
      await new Promise(resolve => client.once('open', resolve));
      const reply = new Promise<string>(resolve =>
        client.once('message', data => resolve(data.toString())),
      );
      client.send(JSON.stringify({ event: 'open', data: {} }));
      try {
        return JSON.parse(await reply);
      } finally {
        client.close();
      }
    };

    it.each([
      ['its class', { provide: VaultGateway, useClass: VaultGateway }],
      ['another token', { provide: 'VAULT', useClass: VaultGateway }],
      [
        'another token and a request-scoped guard',
        { provide: 'VAULT', useClass: RequestScopedVaultGateway },
      ],
    ])(
      'should run its guards when it is provided under %s',
      async (_, provider) => {
        const { event, data } = await sendOpen(provider);

        expect(event).toBe('exception');
        expect(data.message).toBe('Forbidden resource');
      },
    );
  });

  describe('when a resolver is registered with "useClass" under another token', () => {
    let moduleRef: TestingModule;

    afterEach(async () => {
      await moduleRef.close();
    });

    const compile = async (providers: Provider[]) => {
      moduleRef = await Test.createTestingModule({
        providers: [
          { provide: 'PAYROLL', useClass: PayrollResolver },
          ...providers,
        ],
      }).compile();
      const hostModule = [...moduleRef.get(ModulesContainer).values()].find(
        ({ providers }) => providers.has('PAYROLL'),
      )!;
      return { hostModule, wrapper: hostModule.providers.get('PAYROLL')! };
    };

    // What @nestjs/graphql does for a static resolver
    const createStaticHandler = async (
      providers: Provider[],
      methodName: 'payroll' | 'secret',
    ) => {
      const { wrapper } = await compile(providers);
      expect(wrapper.isDependencyTreeStatic()).toBe(true);
      const resolver = wrapper.instance as PayrollResolver;
      return moduleRef
        .get(ExternalContextCreator)
        .create(resolver, resolver[methodName], methodName);
    };

    // What @nestjs/graphql does for a resolver that is not static
    const createRequestScopedHandler = async (
      providers: Provider[],
      methodName: 'payroll' | 'secret',
    ) => {
      const { hostModule, wrapper } = await compile(providers);
      expect(wrapper.isDependencyTreeStatic()).toBe(false);
      const contextId = ContextIdFactory.create();
      moduleRef.registerRequestByContextId({}, contextId);
      const resolver = await new Injector().loadPerContext(
        wrapper.instance as PayrollResolver,
        hostModule,
        hostModule.providers,
        contextId,
      );
      return moduleRef
        .get(ExternalContextCreator)
        .create(
          resolver,
          resolver[methodName],
          methodName,
          undefined,
          undefined,
          contextId,
          wrapper.id,
        );
    };

    it('should run a request-scoped global guard on it', async () => {
      const handler = await createRequestScopedHandler(
        [{ provide: APP_GUARD, useClass: RequestScopedDenyGuard }],
        'payroll',
      );

      await expect(handler()).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should run its own guards', async () => {
      const handler = await createStaticHandler([], 'secret');

      await expect(handler()).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should run its own guards when it is request-scoped', async () => {
      const handler = await createRequestScopedHandler(
        [{ provide: APP_GUARD, useClass: RequestScopedAllowGuard }],
        'secret',
      );

      await expect(handler()).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should run a transient global guard on it', async () => {
      const handler = await createStaticHandler(
        [{ provide: APP_GUARD, useClass: TransientDenyGuard }],
        'payroll',
      );

      await expect(handler()).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
