import { ApplicationConfig } from '@nestjs/core';
import { WebSocketGateway } from '../decorators/socket-gateway.decorator.js';
import { SocketModule } from '../socket-module.js';
import { AbstractWsAdapter } from '../adapters/ws-adapter.js';

describe('SocketModule', () => {
  @WebSocketGateway()
  class FirstGateway {}
  @WebSocketGateway()
  class SecondGateway {}
  @WebSocketGateway()
  class ThirdGateway {}
  class NotAGateway {}

  const wrapperOf = (metatype: Function) =>
    [metatype, { metatype, instance: {}, isNotMetatype: false }] as const;

  class PresetAdapter extends AbstractWsAdapter {
    create() {
      return {} as any;
    }
    bindMessageHandlers() {}
  }

  let socketModule: SocketModule;
  let applicationConfig: ApplicationConfig;
  let connected: string[];

  beforeEach(() => {
    socketModule = new SocketModule();
    applicationConfig = new ApplicationConfig();
    connected = [];
    Object.assign(socketModule, {
      applicationConfig,
      appOptions: {},
      webSocketsController: {
        connectGatewayToServer: (wrapper: { metatype: Function }) =>
          connected.push(wrapper.metatype.name),
      },
    });
  });

  describe('connectAllGateways', () => {
    // As register() does, for the modules of the application
    const connectAll = () =>
      Promise.all([
        socketModule.connectAllGateways(
          new Map<any, any>([
            wrapperOf(FirstGateway),
            wrapperOf(NotAGateway),
            wrapperOf(SecondGateway),
          ]),
          'FirstModule',
        ),
        socketModule.connectAllGateways(
          new Map<any, any>([wrapperOf(ThirdGateway)]),
          'SecondModule',
        ),
      ]);

    // Of gateways that share a server, the first one connected creates it
    // with its own options
    it('should connect the gateways in the order they are declared in, with an adapter set by the application', async () => {
      applicationConfig.setIoAdapter(new PresetAdapter());

      await connectAll();

      expect(connected).toEqual([
        'FirstGateway',
        'SecondGateway',
        'ThirdGateway',
      ]);
    });

    it('should connect the gateways in the order they are declared in, with the default adapter', async () => {
      await connectAll();

      expect(connected).toEqual([
        'FirstGateway',
        'SecondGateway',
        'ThirdGateway',
      ]);
      expect(applicationConfig.getIoAdapter()?.constructor.name).toBe(
        'IoAdapter',
      );
    });

    it('should create the default adapter once', async () => {
      await connectAll();
      const adapter = applicationConfig.getIoAdapter();
      await connectAll();

      expect(applicationConfig.getIoAdapter()).toBe(adapter);
    });
  });
});
