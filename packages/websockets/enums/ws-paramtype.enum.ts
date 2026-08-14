import { RouteParamtypes } from '@nestjs/common/internal';

export enum WsParamtype {
  SOCKET = RouteParamtypes.REQUEST,
  PAYLOAD = RouteParamtypes.BODY,
  ACK = RouteParamtypes.ACK,
}
