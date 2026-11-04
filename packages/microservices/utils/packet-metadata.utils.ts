import { isString } from '@nestjs/common/internal';
import { PacketMetadata } from '../interfaces/packet.interface.js';

/**
 * Reads packet metadata off a transport's own header channel (NATS headers,
 * Kafka headers, RabbitMQ message headers, MQTT 5 user properties, gRPC call
 * metadata): every entry that holds a single string.
 *
 * An entry with several values, a number, a nested table or binary content
 * has no `PacketMetadata` form. It is left out here, and stays readable
 * through the transport's own message.
 *
 * Returns `undefined` when no entry qualifies, as the TCP and Redis contexts
 * do for a packet sent without metadata.
 */
export function toPacketMetadata(
  entries: Iterable<[string, unknown]>,
): PacketMetadata | undefined {
  let metadata: PacketMetadata | undefined;
  for (const [key, value] of entries) {
    if (isString(value)) {
      metadata ??= {};
      metadata[key] = value;
    }
  }
  return metadata;
}

/**
 * Whether a dispatch hook attached any metadata to a packet. An empty object
 * counts as none, so that it adds no (empty) header channel to a message.
 */
export function hasPacketMetadata(
  metadata: PacketMetadata | undefined,
): metadata is PacketMetadata {
  return !!metadata && Object.keys(metadata).length > 0;
}
