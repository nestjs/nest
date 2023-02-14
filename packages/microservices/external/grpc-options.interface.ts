/**
 * An interface that contains options used when initializing a Channel instance.
 * This listing is incomplete. Full reference: https://grpc.github.io/grpc/core/group__grpc__arg__keys.html
 *
 * @publicApi
 */
export interface ChannelOptions {
  'grpc.max_send_message_length'?: number;
  'grpc.max_receive_message_length'?: number;
  'grpc.max_metadata_size'?: number;
  'grpc.ssl_target_name_override'?: string;
  'grpc.primary_user_agent'?: string;
  'grpc.secondary_user_agent'?: string;
  'grpc.default_authority'?: string;
  'grpc.service_config'?: string;
  'grpc.max_concurrent_streams'?: number;
  'grpc.initial_reconnect_backoff_ms'?: number;
  'grpc.max_reconnect_backoff_ms'?: number;
  'grpc.use_local_subchannel_pool'?: number;
  'grpc-node.max_session_memory'?: number;
  [key: string]: any;
}
