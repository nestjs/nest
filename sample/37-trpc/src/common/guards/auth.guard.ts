import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { AppTrpcContext, DEMO_API_KEY } from '../trpc-context';

/**
 * A sample guard that demonstrates NestJS guard integration with tRPC.
 *
 * In production, this would verify JWT tokens or session cookies.
 * For this sample, it checks for an `x-api-key` header.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  canActivate(context: ExecutionContext): boolean {
    // In tRPC context, args[0] = input, args[1] = tRPC context
    const args = context.getArgs();
    const trpcCtx = args[1] as AppTrpcContext | undefined;

    // Sample auth contract:
    // createContext stores x-api-key into trpcCtx.apiKey.
    const isAuthenticated =
      trpcCtx?.requestId != null && trpcCtx.apiKey === DEMO_API_KEY;
    this.logger.debug(
      `AuthGuard: requestId=${trpcCtx?.requestId}, apiKey=${trpcCtx?.apiKey ?? 'missing'}, allowed=${isAuthenticated}`,
    );
    return isAuthenticated;
  }
}
