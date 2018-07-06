export interface NestGateway {
  afterInit?: (server: any) => void;
  handleConnection?: (client: any, ...rest: any[]) => void;
  handleDisconnect?: (client: any) => void;
}
