import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the tRPC context object from the execution context.
 *
 * @publicApi
 */
export const TrpcContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    return ctx.switchToRpc().getContext();
  },
);
