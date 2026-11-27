import {
  BadRequestException,
  Controller,
  createParamDecorator,
  type ExecutionContext,
  Get,
  Module,
  type PipeTransform,
  Res,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { IsString } from 'class-validator';

/**
 * Gives the handler the response, as `@Res()` does. The Fastify reply is a
 * thenable: its `then()` waits for the response to be sent.
 */
const CustomRes = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getResponse(),
);

/**
 * Resolves to the `from` query param a tick later.
 */
const Later = createParamDecorator(
  async (_data: unknown, ctx: ExecutionContext) => {
    await new Promise(resolve => setImmediate(resolve));
    return { from: ctx.switchToHttp().getRequest().query.from };
  },
);

export class LaterDto {
  @IsString()
  from: string;
}

/**
 * Rejects whatever it runs on.
 */
class RejectPipe implements PipeTransform {
  transform(): never {
    throw new BadRequestException('A pipe ran on the response');
  }
}

@Controller()
class ResponseParamController {
  constructor(private readonly adapterHost: HttpAdapterHost) {}

  @Get('response')
  response(@CustomRes() response: any, @Res({ passthrough: true }) res: any) {
    this.adapterHost.httpAdapter.setHeader(response, 'x-from-param', 'yes');
    return { same: response === res };
  }

  @Get('response-with-pipe')
  responseWithPipe(@CustomRes(new RejectPipe()) response: any) {
    this.adapterHost.httpAdapter.setHeader(response, 'x-from-param', 'yes');
    return { piped: false };
  }

  @Get('later')
  later(@Later() value: LaterDto) {
    return value;
  }
}

@Module({ controllers: [ResponseParamController] })
export class ResponseParamModule {}
