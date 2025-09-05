import { RuntimeException } from '@nestjs/core/errors/exceptions/runtime.exception';

export class InvalidTcpMessageException extends RuntimeException {
  constructor(err:string) {
    const _errMsg = err.includes('Corrupted length value') ? 'Corrupted length value of the received data supplied in a packet.' : `The invalid received message from tcp server.`
    super(_errMsg);
  }
}
