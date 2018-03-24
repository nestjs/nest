import { Type } from '@nestjs/common/interfaces/type.interface';
import { GatewayMiddleware } from './gateway-middleware.interface';
export interface GatewayMetadata {
    port?: number;
    namespace?: string;
    middlewares?: Type<GatewayMiddleware>[];
}
