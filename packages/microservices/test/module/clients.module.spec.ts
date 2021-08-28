import { DynamicModule, FactoryProvider, Injectable } from '@nestjs/common';
import * as sinon from 'sinon';
import { ClientProxyFactory } from '../../client';
import { Transport } from '../../enums';
import { ClientOptions } from '../../interfaces';
import { ClientsModule, ClientsModuleOptionsFactory } from '../../module';

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
      expect(dynamicModule.providers).toEqual([
        {
          provide: 'test',
          useValue: ClientsModule['assignOnAppShutdownHook'](
            ClientProxyFactory.create({}),
          ),
        },
      ]);
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
        expect(dynamicModule.exports).toEqual(dynamicModule.providers);
        expect(dynamicModule.providers.length).toBe(1);

        const provider = dynamicModule.providers[0] as FactoryProvider;
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
        expect(dynamicModule.providers.length).toBe(2);

        const classTestProvider = dynamicModule.providers[0] as FactoryProvider;
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
          createClientOptions: sinon.spy(),
        };
        try {
          await ((dynamicModule.providers[0] as any).useFactory as any)(
            optionsFactory,
          );
        } catch (e) {
          console.log(e);
        }
        expect(optionsFactory.createClientOptions.called).toBeTruthy();
      });
    });

    describe('when useExisting', () => {
      it('should provide an options', () => {
        const asyncOptions = {
          useExisting: Object,
        };
        dynamicModule = ClientsModule.registerAsync([asyncOptions as any]);
        expect(dynamicModule.providers.length).toBe(1);
        expect(dynamicModule.imports).toEqual([]);
        const classTestProvider = dynamicModule.providers[0] as FactoryProvider;
        expect(classTestProvider.useFactory).toBeInstanceOf(Function);
      });
    });
  });
});
