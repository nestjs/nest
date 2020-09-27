import { DynamicModule, FactoryProvider, Injectable } from '@nestjs/common';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { ClientProxyFactory } from '../../client';
import { ClientsModule, ClientsModuleOptionsFactory } from '../../module';
import { ClientOptions } from '../../interfaces';
import { Transport } from '../../enums';

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
      expect(dynamicModule.module).to.be.eql(ClientsModule);
    });
    it('should return an expected providers array', () => {
      expect(dynamicModule.providers).to.be.deep.eq([
        {
          provide: 'test',
          useValue: ClientProxyFactory.create({}),
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
      expect(dynamicModule.module).to.be.eql(ClientsModule);
    });

    describe('when useFactory', () => {
      it('should return an expected providers array with useFactory', () => {
        dynamicModule = ClientsModule.registerAsync([registerOption]);
        expect(dynamicModule.imports).to.be.deep.eq([]);
        expect(dynamicModule.exports).to.be.eq(dynamicModule.providers);
        expect(dynamicModule.providers).to.be.have.length(1);

        const provider = dynamicModule.providers[0] as FactoryProvider;
        expect(provider.provide).to.be.eql('test');
        expect(provider.inject).to.be.deep.eq([]);
        expect(provider.useFactory).to.be.an.instanceOf(Function);
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
        expect(dynamicModule.imports).to.be.deep.eq([]);
        expect(dynamicModule.providers).to.be.have.length(2);

        const classTestProvider = dynamicModule.providers[0] as FactoryProvider;
        expect(classTestProvider.provide).to.be.eql('classTest');
        expect(classTestProvider.inject).to.be.deep.eq([ClientOptionService]);
        expect(classTestProvider.useFactory).to.be.an.instanceOf(Function);
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
        expect(optionsFactory.createClientOptions.called).to.be.true;
      });
    });

    describe('when useExisting', () => {
      it('should provide an options', () => {
        const asyncOptions = {
          useExisting: Object,
        };
        dynamicModule = ClientsModule.registerAsync([asyncOptions as any]);
        expect(dynamicModule.providers).to.have.length(1);
        expect(dynamicModule.imports).to.be.deep.eq([]);
        const classTestProvider = dynamicModule.providers[0] as FactoryProvider;
        expect(classTestProvider.useFactory).to.be.an.instanceOf(Function);
      });
    });
  });
});
