export const TCP_DEFAULT_PORT = 3000;
export const TCP_DEFAULT_HOST = 'localhost';
export const REDIS_DEFAULT_URL = 'redis://localhost:6379';
export const NATS_DEFAULT_URL = 'nats://localhost:4222';
export const MQTT_DEFAULT_URL = 'mqtt://localhost:1883';
export const GRPC_DEFAULT_URL = 'localhost:5000';

export const CONNECT_EVENT = 'connect';
export const MESSAGE_EVENT = 'message';
export const ERROR_EVENT = 'error';
export const CLOSE_EVENT = 'close';
export const SUBSCRIBE = 'subscribe';
export const CANCEL_EVENT = 'cancelled';

export const PATTERN_METADATA = 'pattern';
export const CLIENT_CONFIGURATION_METADATA = 'client';
export const CLIENT_METADATA = '__isClient';
export const PATTERN_HANDLER_METADATA = '__isPattern';
export const NO_PATTERN_MESSAGE = `There is no equivalent message pattern defined in the remote service.`;
