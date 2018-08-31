export interface NestGateway {
  afterInit?: (server: any) => void;
  handleConnection?: (...args: any[]) => void;
  handleDisconnect?: (client: any) => void;
}
