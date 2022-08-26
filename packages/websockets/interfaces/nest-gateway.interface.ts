export interface NestGateway {
  afterInit?: (server: any) => void;
  handleConnection?: (client: any, request?: any) => void;
  handleDisconnect?: (client: any) => void;
}
