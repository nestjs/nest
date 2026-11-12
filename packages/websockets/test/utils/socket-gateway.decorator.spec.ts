import { GATEWAY_METADATA, GATEWAY_OPTIONS } from '../../constants.js';
import { WebSocketGateway } from '../../decorators/socket-gateway.decorator.js';

describe('@WebSocketGateway', () => {
  @WebSocketGateway(80, { namespace: '/' })
  class TestGateway {}

  it('should decorate transport with expected metadata', () => {
    const isGateway = Reflect.getMetadata(GATEWAY_METADATA, TestGateway);
    const port = Reflect.getMetadata('port', TestGateway);
    const { namespace } = Reflect.getMetadata(GATEWAY_OPTIONS, TestGateway);

    expect(isGateway).toEqual(true);
    expect(port).toEqual(80);
    expect(namespace).toEqual('/');
  });

  @WebSocketGateway()
  class TestGateway2 {}

  it('should decorate transport with port: 0', () => {
    const isGateway = Reflect.getMetadata(GATEWAY_METADATA, TestGateway2);
    const port = Reflect.getMetadata('port', TestGateway2);

    expect(isGateway).toEqual(true);
    expect(port).toEqual(0);
  });

  @WebSocketGateway({ namespace: '/' })
  class TestGateway3 {}

  it('should decorate transport with expected options', () => {
    const isGateway = Reflect.getMetadata(GATEWAY_METADATA, TestGateway3);
    const port = Reflect.getMetadata('port', TestGateway3);
    const { namespace } = Reflect.getMetadata(GATEWAY_OPTIONS, TestGateway3);

    expect(isGateway).toEqual(true);
    expect(port).toEqual(0);
    expect(namespace).toEqual('/');
  });

  const verifyClient = () => false;

  it.each([
    ['NaN', NaN],
    ['a string', '8080'],
    ['a fraction', 3.5],
  ])('should keep the options next to a port that is %s', (_, invalidPort) => {
    @WebSocketGateway(invalidPort as number, { verifyClient })
    class InvalidPortGateway {}

    expect(Reflect.getMetadata('port', InvalidPortGateway)).toBe(invalidPort);
    expect(Reflect.getMetadata(GATEWAY_OPTIONS, InvalidPortGateway)).toEqual({
      verifyClient,
    });
  });

  it('should keep the options next to an undefined port', () => {
    @WebSocketGateway(undefined, { verifyClient })
    class UndefinedPortGateway {}

    expect(Reflect.getMetadata('port', UndefinedPortGateway)).toBe(0);
    expect(Reflect.getMetadata(GATEWAY_OPTIONS, UndefinedPortGateway)).toEqual({
      verifyClient,
    });
  });
});
