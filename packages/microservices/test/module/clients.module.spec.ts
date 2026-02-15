import {
  DynamicModule,
  FactoryProvider,
  Injectable,
  ValueProvider,
} from '@nestjs/common';
import { ClientProxyFactory } from '../../client/index.js';
import { Transport } from '../../enums/index.js';
import { ClientOptions } from '../../interfaces/index.js';
import {
  ClientsModule,
  ClientsModuleOptionsFactory,
} from '../../module/index.js';

describe('ClientsModule', () => {
  let dynamicModule: DynamicModule;
  describe('register', () => {
    beforeEach(() => {
      dynamicModule = ClientsModule.register([
        {
          name: 'test',
          options: {},
        },
      ]);
    });
    it('should return an expected module ref', () => {
      expect(dynamicModule.module).toEqual(ClientsModule);
    });
    it('should return an expected providers array', () => {
      const provider = dynamicModule.providers!.find(
        p => 'useValue' in p && p.provide === 'test',
      ) as ValueProvider;
      expect(provider).not.toBeUndefined();
      expect(provider.useValue).toEqual(
        ClientsModule['assignOnAppShutdownHook'](ClientProxyFactory.create({})),
      );
    });
  });
  describe('registerAsync', () => {
    const useFactory = () => ({
      options: {},
    });
    const registerOption = {
      name: 'test',
      useFactory,
    };

    it('should return an expected module ref', () => {
      dynamicModule = ClientsModule.registerAsync([registerOption]);
      expect(dynamicModule.module).toEqual(ClientsModule);
    });

    describe('when useFactory', () => {
      it('should return an expected providers array with useFactory', () => {
        dynamicModule = ClientsModule.registerAsync([registerOption]);
        expect(dynamicModule.imports).toEqual([]);
        expect(dynamicModule.exports).toBe(dynamicModule.providers);
        expect(dynamicModule.providers).toHaveLength(1);

        const provider = dynamicModule.providers![0] as FactoryProvider;
        expect(provider.provide).toEqual('test');
        expect(provider.inject).toEqual([]);
        expect(provider.useFactory).toBeInstanceOf(Function);
      });
    });

    describe('when useClass', () => {
      it('should return an expected providers array with useClass', () => {
        @Injectable()
        class ClientOptionService implements ClientsModuleOptionsFactory {
          createClientOptions(): Promise<ClientOptions> | ClientOptions {
            return {
              transport: Transport.TCP,
              options: {},
            };
          }
        }
        const useClassOption = {
          name: 'classTest',
          useClass: ClientOptionService,
        };
        dynamicModule = ClientsModule.registerAsync([useClassOption]);
        expect(dynamicModule.imports).toEqual([]);
        expect(dynamicModule.providers).toHaveLength(2);

        const classTestProvider = dynamicModule
          .providers![0] as FactoryProvider;
        expect(classTestProvider.provide).toEqual('classTest');
        expect(classTestProvider.inject).toEqual([ClientOptionService]);
        expect(classTestProvider.useFactory).toBeInstanceOf(Function);
      });
      it('provider should call "createClientOptions"', async () => {
        const asyncOptions = {
          useClass: Object,
        };
        const dynamicModule = ClientsModule.registerAsync([
          asyncOptions as any,
        ]);
        const optionsFactory = {
          createClientOptions: vi.fn(),
        };
        try {
          await (dynamicModule.providers![0] as any).useFactory(optionsFactory);
        } catch (e) {
          console.log(e);
        }
        expect(optionsFactory.createClientOptions).toHaveBeenCalled();
      });
    });

    describe('when useExisting', () => {
      it('should provide an options', () => {
        const asyncOptions = {
          useExisting: Object,
        };
        dynamicModule = ClientsModule.registerAsync([asyncOptions as any]);
        expect(dynamicModule.providers).toHaveLength(1);
        expect(dynamicModule.imports).toEqual([]);
        const classTestProvider = dynamicModule
          .providers![0] as FactoryProvider;
        expect(classTestProvider.useFactory).toBeInstanceOf(Function);
      });
    });
  });
});
