import { RouteParamtypes } from '@nestjs/common/internal';

export enum RpcParamtype {
  PAYLOAD = RouteParamtypes.BODY,
  CONTEXT = RouteParamtypes.HEADERS,
  GRPC_CALL = RouteParamtypes.FILES,
}
