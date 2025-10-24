import { RuntimeException } from '@nestjs/core/errors/exceptions/runtime.exception';

export class InvalidTcpDataReceptionException extends RuntimeException {
  constructor(err: string | Error) {
    const errMsgStr =
      typeof err === 'string'
        ? err
        : err &&
            typeof err === 'object' &&
            'message' in err &&
            typeof (err as any).message === 'string'
          ? (err as any).message
          : String(err);
    const _errMsg = errMsgStr.includes('Corrupted length value')
      ? `Corrupted length value of the received data supplied in a packet`
      : `The invalid received message from tcp server`;
    super(_errMsg);
  }
}
