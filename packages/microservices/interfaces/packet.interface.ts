export interface PacketId {
  id: string;
}

/**
 * Out-of-band values that travel with a packet but are not part of its
 * payload - a trace id, a tenant, a locale. Set on the client through
 * `ClientProxy#setOnDispatchHook`, read on the server from the RPC context.
 *
 * Each transport carries it on its own channel: inside the packet over TCP
 * and Redis, and as headers everywhere else - NATS message headers, Kafka
 * record headers, RabbitMQ message `headers`, MQTT 5 user properties and gRPC
 * call metadata. On the header transports, the server's context returns every
 * header with a single string value, whoever set it.
 */
export type PacketMetadata = Record<string, string>;

export interface ReadPacket<T = any> {
  pattern: any;
  data: T;
  metadata?: PacketMetadata;
}

export interface WritePacket<T = any> {
  err?: any;
  response?: T;
  isDisposed?: boolean;
  status?: string;
}

export type OutgoingRequest = ReadPacket & PacketId;
export type IncomingRequest = ReadPacket & PacketId;
export type OutgoingEvent = ReadPacket;
export type IncomingEvent = ReadPacket;
export type IncomingResponse = WritePacket & PacketId;
export type OutgoingResponse = WritePacket & PacketId;
