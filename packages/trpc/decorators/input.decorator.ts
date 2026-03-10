import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the validated tRPC input from the execution context.
 *
 * @publicApi
 */
export const Input = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const trpcCtx = ctx.switchToRpc().getData();
    if (data) {
      return trpcCtx?.[data];
    }
    return trpcCtx;
  },
);
