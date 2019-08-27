export interface PacketId {
  id: string;
}

export interface ReadPacket<T = any> {
  pattern: any;
  data: T;
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
