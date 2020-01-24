import { expect } from 'chai';
import { GATEWAY_METADATA, GATEWAY_OPTIONS } from '../../constants';
import { WebSocketGateway } from '../../decorators/socket-gateway.decorator';

describe('@WebSocketGateway', () => {
  @WebSocketGateway(80, { namespace: '/' })
  class TestGateway {}

  it('should decorate transport with expected metadata', () => {
    const isGateway = Reflect.getMetadata(GATEWAY_METADATA, TestGateway);
    const port = Reflect.getMetadata('port', TestGateway);
    const { namespace } = Reflect.getMetadata(GATEWAY_OPTIONS, TestGateway);

    expect(isGateway).to.be.eql(true);
    expect(port).to.be.eql(80);
    expect(namespace).to.be.eql('/');
  });

  @WebSocketGateway()
  class TestGateway2 {}

  it('should decorate transport with port: 0', () => {
    const isGateway = Reflect.getMetadata(GATEWAY_METADATA, TestGateway2);
    const port = Reflect.getMetadata('port', TestGateway2);

    expect(isGateway).to.be.eql(true);
    expect(port).to.be.eql(0);
  });

  @WebSocketGateway({ namespace: '/' })
  class TestGateway3 {}

  it('should decorate transport with expected options', () => {
    const isGateway = Reflect.getMetadata(GATEWAY_METADATA, TestGateway3);
    const port = Reflect.getMetadata('port', TestGateway3);
    const { namespace } = Reflect.getMetadata(GATEWAY_OPTIONS, TestGateway3);

    expect(isGateway).to.be.eql(true);
    expect(port).to.be.eql(0);
    expect(namespace).to.be.eql('/');
  });
});
