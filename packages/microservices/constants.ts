export const TCP_DEFAULT_PORT = 3000;
export const TCP_DEFAULT_HOST = 'localhost';
export const REDIS_DEFAULT_URL = 'redis://localhost:6379';
export const NATS_DEFAULT_URL = 'nats://localhost:4222';
export const MQTT_DEFAULT_URL = 'mqtt://localhost:1883';
export const GRPC_DEFAULT_URL = 'localhost:5000';
export const RQM_DEFAULT_URL = 'amqp://localhost';

export const CONNECT_EVENT = 'connect';
export const DISCONNECT_EVENT = 'disconnect';
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
export const DISCONNECTED_RMQ_MESSAGE = `Disconnected from RMQ. Trying to reconnect.`;

export const RQM_DEFAULT_QUEUE = 'default';
export const RQM_DEFAULT_PREFETCH_COUNT = 0;
export const RQM_DEFAULT_IS_GLOBAL_PREFETCH_COUNT = false;
export const RQM_DEFAULT_QUEUE_OPTIONS = {};
