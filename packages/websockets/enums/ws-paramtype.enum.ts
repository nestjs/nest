import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum.js';

export enum WsParamtype {
  SOCKET = RouteParamtypes.REQUEST,
  PAYLOAD = RouteParamtypes.BODY,
  ACK = RouteParamtypes.ACK,
}
