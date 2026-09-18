export interface PacketId {
  id: string;
}

/**
 * Out-of-band values that travel with a packet but are not part of its
 * payload - a trace id, a tenant, a locale. Set on the client through
 * `ClientProxy#setOnDispatchHook`, read on the server from the RPC context.
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
