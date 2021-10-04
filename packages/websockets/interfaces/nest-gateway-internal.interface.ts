import { NestGateway } from './nest-gateway.interface';

/**
 * @desc Internal representation of a typical NestGateway. Use to add fields that
 * should not be presented in public interfaces.
 */
export interface NestGatewayInternal extends NestGateway {
  constructor: Function;
}
