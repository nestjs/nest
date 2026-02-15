import { RuntimeException } from '@nestjs/core/internal';

export interface RpcDecoratorMetadata {
  service: string;
  rpc: string;
  streaming: string;
}

/**
 * @publicApi
 */
export class InvalidGrpcDecoratorException extends RuntimeException {
  constructor(metadata: RpcDecoratorMetadata) {
    super(
      `The invalid gRPC decorator (method "${metadata.rpc}" in service "${metadata.service}")`,
    );
  }
}
