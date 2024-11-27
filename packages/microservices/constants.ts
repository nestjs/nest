import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';

export const TCP_DEFAULT_PORT = 3000;
export const TCP_DEFAULT_HOST = 'localhost';
export const REDIS_DEFAULT_PORT = 6379;
export const REDIS_DEFAULT_HOST = 'localhost';
export const NATS_DEFAULT_URL = 'nats://localhost:4222';
export const MQTT_DEFAULT_URL = 'mqtt://localhost:1883';
export const GRPC_DEFAULT_URL = 'localhost:5000';
export const RQM_DEFAULT_URL = 'amqp://localhost';
export const KAFKA_DEFAULT_BROKER = 'localhost:9092';
export const KAFKA_DEFAULT_CLIENT = 'nestjs-consumer';
export const KAFKA_DEFAULT_GROUP = 'nestjs-group';
export const MQTT_SEPARATOR = '/';
export const MQTT_WILDCARD_SINGLE = '+';
export const MQTT_WILDCARD_ALL = '#';
export const RQM_DEFAULT_QUEUE = 'default';
export const RQM_DEFAULT_PREFETCH_COUNT = 0;
export const RQM_DEFAULT_IS_GLOBAL_PREFETCH_COUNT = false;
export const RQM_DEFAULT_QUEUE_OPTIONS = {};
export const RQM_DEFAULT_NOACK = true;
export const RQM_DEFAULT_PERSISTENT = false;
export const RQM_DEFAULT_NO_ASSERT = false;

export const ECONNREFUSED = 'ECONNREFUSED';
export const CONN_ERR = 'CONN_ERR';
export const EADDRINUSE = 'EADDRINUSE';
export const ENOTFOUND = 'ENOTFOUND';

export const PATTERN_METADATA = 'microservices:pattern';
export const PATTERN_EXTRAS_METADATA = 'microservices:pattern_extras';
export const TRANSPORT_METADATA = 'microservices:transport';
export const CLIENT_CONFIGURATION_METADATA = 'microservices:client';
export const PATTERN_HANDLER_METADATA = 'microservices:handler_type';
export const CLIENT_METADATA = 'microservices:is_client_instance';
export const PARAM_ARGS_METADATA = ROUTE_ARGS_METADATA;
export const REQUEST_PATTERN_METADATA = 'microservices:request_pattern';
export const REPLY_PATTERN_METADATA = 'microservices:reply_pattern';

export const RQM_NO_EVENT_HANDLER = (
  text: TemplateStringsArray,
  pattern: string,
) =>
  `An unsupported event was received. It has been negative acknowledged, so it will not be re-delivered. Pattern: ${pattern}`;
export const RQM_NO_MESSAGE_HANDLER = (
  text: TemplateStringsArray,
  pattern: string,
) =>
  `An unsupported message was received. It has been negative acknowledged, so it will not be re-delivered. Pattern: ${pattern}`;
export const GRPC_DEFAULT_PROTO_LOADER = '@grpc/proto-loader';

export const NO_EVENT_HANDLER = (text: TemplateStringsArray, pattern: string) =>
  `There is no matching event handler defined in the remote service. Event pattern: ${pattern}`;
export const NO_MESSAGE_HANDLER = `There is no matching message handler defined in the remote service.`;
export const DISCONNECTED_RMQ_MESSAGE = `Disconnected from RMQ. Trying to reconnect.`;
export const CONNECTION_FAILED_MESSAGE =
  'Connection to transport failed. Trying to reconnect...';

export const NATS_DEFAULT_GRACE_PERIOD = 10000;
