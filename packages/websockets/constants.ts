import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';

export const MESSAGE_MAPPING_METADATA = 'websockets:message_mapping';
export const MESSAGE_METADATA = 'message';
export const GATEWAY_SERVER_METADATA = 'websockets:is_socket';
export const GATEWAY_METADATA = 'websockets:is_gateway';
export const NAMESPACE_METADATA = 'namespace';
export const PORT_METADATA = 'port';
export const GATEWAY_OPTIONS = 'websockets:gateway_options';
export const PARAM_ARGS_METADATA = ROUTE_ARGS_METADATA;

export const CONNECTION_EVENT = 'connection';
export const DISCONNECT_EVENT = 'disconnect';
export const CLOSE_EVENT = 'close';
export const ERROR_EVENT = 'error';
