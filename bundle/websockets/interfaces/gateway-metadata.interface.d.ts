export interface GatewayMetadata {
    namespace?: string;
    path?: string;
    serveClient?: boolean;
    adapter?: any;
    origins?: string;
    parser?: any;
    pingTimeout?: number;
    pingInterval?: number;
    transports?: string[];
}
