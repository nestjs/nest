import { GrpcStatus } from '../../enums/grpc-status.enum';
import {
  InternalServerErrorException,
  BadRequestException,
  GatewayTimeoutException,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  ServiceUnavailableException,
  TooManyRequestsException,
  NotImplementedException,
} from '@nestjs/common';

interface IGrpcToHttpExceptionMapping {
  [grpcStatus: number]: typeof InternalServerErrorException;
}

// Based on https://github.com/grpc/grpc/blob/master/doc/statuscodes.md
export const GrpcToHttpExceptionMapping: IGrpcToHttpExceptionMapping = {
  [GrpcStatus.OK]: null,
  // Since "499 CLIENT CLOSED REQUEST" is not standard HTTP exception, we don't follow Google recommendation
  // We return a "503 SERVICE UNAVAILABLE" instead
  [GrpcStatus.CANCELLED]: ServiceUnavailableException,
  [GrpcStatus.UNKNOWN]: InternalServerErrorException,
  [GrpcStatus.INVALID_ARGUMENT]: BadRequestException,
  [GrpcStatus.DEADLINE_EXCEEDED]: GatewayTimeoutException,
  [GrpcStatus.NOT_FOUND]: NotFoundException,
  [GrpcStatus.ALREADY_EXISTS]: ConflictException,
  [GrpcStatus.PERMISSION_DENIED]: ForbiddenException,
  [GrpcStatus.UNAUTHENTICATED]: UnauthorizedException,
  [GrpcStatus.RESOURCE_EXHAUSTED]: TooManyRequestsException,
  [GrpcStatus.FAILED_PRECONDITION]: BadRequestException,
  [GrpcStatus.DEADLINE_EXCEEDED]: GatewayTimeoutException,
  [GrpcStatus.ABORTED]: ConflictException,
  [GrpcStatus.OUT_OF_RANGE]: BadRequestException,
  [GrpcStatus.UNIMPLEMENTED]: NotImplementedException,
  [GrpcStatus.INTERNAL]: InternalServerErrorException,
  [GrpcStatus.UNAVAILABLE]: ServiceUnavailableException,
  [GrpcStatus.DATA_LOSS]: InternalServerErrorException,
};
