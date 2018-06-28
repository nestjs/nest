export interface NestGateway {
  afterInit?: (server: any) => void;
  handleConnection?: (client: any, req?: any) => void;
  handleDisconnect?: (client: any) => void;
}
