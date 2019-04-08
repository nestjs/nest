import { GrpcStatus } from '../enums/grpc-status.enum';
import { isObject } from '@nestjs/common/utils/shared.utils';

export class GrpcException extends Error {
  public readonly message: string;
  constructor(
    public readonly code: number,
    private readonly error: string | object,
  ) {
    super();
    this.message =
      (isObject(error) && (error as { message?: string }).message) ||
      error.toString();
  }
  getError() {
    return this.error;
  }
  getCode() {
    return this.code;
  }
}

export class GrpcCanceledException extends GrpcException {
  constructor(error: string | object) {
    super(GrpcStatus.CANCELLED, error);
  }
}

export class GrpcUnkownException extends GrpcException {
  constructor(error: string | object) {
    super(GrpcStatus.UNKNOWN, error);
  }
}

export class GrpcInvalidArgumentException extends GrpcException {
  constructor(error: string | object) {
    super(GrpcStatus.INVALID_ARGUMENT, error);
  }
}

export class GrpcDeadlineExceededException extends GrpcException {
  constructor(error: string | object) {
    super(GrpcStatus.DEADLINE_EXCEEDED, error);
  }
}

export class GrpcNotFoundException extends GrpcException {
  constructor(error: string | object) {
    super(GrpcStatus.NOT_FOUND, error);
  }
}

export class GrpcAlreadyExistException extends GrpcException {
  constructor(error: string | object) {
    super(GrpcStatus.ALREADY_EXISTS, error);
  }
}

export class GrpcPermissionDeniedException extends GrpcException {
  constructor(error: string | object) {
    super(GrpcStatus.PERMISSION_DENIED, error);
  }
}

export class GrpcUnauthenticatedException extends GrpcException {
  constructor(error: string | object) {
    super(GrpcStatus.UNAUTHENTICATED, error);
  }
}

export class GrpcRessourceExhaustedException extends GrpcException {
  constructor(error: string | object) {
    super(GrpcStatus.RESOURCE_EXHAUSTED, error);
  }
}

export class GrpcFailedPreconditionException extends GrpcException {
  constructor(error: string | object) {
    super(GrpcStatus.FAILED_PRECONDITION, error);
  }
}

export class GrpcAbortedException extends GrpcException {
  constructor(error: string | object) {
    super(GrpcStatus.ABORTED, error);
  }
}

export class GrpcOutOfRangeException extends GrpcException {
  constructor(error: string | object) {
    super(GrpcStatus.OUT_OF_RANGE, error);
  }
}

export class GrpcUnimplementedException extends GrpcException {
  constructor(error: string | object) {
    super(GrpcStatus.UNIMPLEMENTED, error);
  }
}

export class GrpcInternalException extends GrpcException {
  constructor(error: string | object) {
    super(GrpcStatus.CANCELLED, error);
  }
}

export class GrpcUnavailableException extends GrpcException {
  constructor(error: string | object) {
    super(GrpcStatus.UNAVAILABLE, error);
  }
}

export class GrpcDataLossException extends GrpcException {
  constructor(error: string | object) {
    super(GrpcStatus.DATA_LOSS, error);
  }
}
