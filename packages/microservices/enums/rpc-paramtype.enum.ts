import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';

export enum RpcParamtype {
  PAYLOAD = RouteParamtypes.BODY,
  CONTEXT = RouteParamtypes.HEADERS,
  GRPC_CALL = RouteParamtypes.FILES,
}
