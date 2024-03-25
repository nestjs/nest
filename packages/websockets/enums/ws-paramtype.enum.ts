import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';

export enum WsParamtype {
  SOCKET = RouteParamtypes.REQUEST,
  PAYLOAD = RouteParamtypes.BODY,
}
