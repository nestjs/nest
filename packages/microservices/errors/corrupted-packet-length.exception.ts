export class CorruptedPacketLengthException extends Error {
  constructor(rawContentLength: string) {
    super(`Corrupted length value "${rawContentLength}" supplied in a packet`);
  }
}
