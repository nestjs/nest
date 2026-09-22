import {
  Controller,
  Cookies,
  Get,
  ParseIntPipe,
  Query,
  Res,
  SignedCookies,
  type CookieSerializeOptions,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Controller()
export class AppController {
  constructor(private readonly adapterHost: HttpAdapterHost) {}

  private get httpAdapter() {
    return this.adapterHost.httpAdapter;
  }

  @Get('cookies')
  all(@Cookies() cookies: Record<string, string>) {
    return { ...cookies };
  }

  @Get('cookies/theme')
  one(@Cookies('theme') theme?: string) {
    return { theme: theme ?? null };
  }

  @Get('cookies/count')
  count(@Cookies('count', ParseIntPipe) count: number) {
    return { count };
  }

  @Get('signed')
  allSigned(@SignedCookies() cookies: Record<string, string>) {
    return { ...cookies };
  }

  @Get('signed/uid')
  oneSigned(@SignedCookies('uid') uid?: string) {
    return { uid: uid ?? null };
  }

  @Get('set')
  set(@Res({ passthrough: true }) res: unknown) {
    this.httpAdapter.setCookie(res, 'a', '1');
    this.httpAdapter.setCookie(res, 'b', 'two words; x=y', {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60,
    });
    this.httpAdapter.setCookie(res, 'uid', '42', { signed: true });
    return { ok: true };
  }

  @Get('clear')
  clear(@Res({ passthrough: true }) res: unknown) {
    this.httpAdapter.clearCookie(res, 'a');
    this.httpAdapter.clearCookie(res, 'b', { path: '/app' });
    return { ok: true };
  }

  @Get('set-custom')
  setCustom(
    @Res({ passthrough: true }) res: unknown,
    @Query('name') name: string,
    @Query('value') value: string,
    @Query('path') path?: string,
    @Query('domain') domain?: string,
  ) {
    const options: CookieSerializeOptions = {};
    if (path !== undefined) {
      options.path = path;
    }
    if (domain !== undefined) {
      options.domain = domain;
    }
    this.httpAdapter.setCookie(res, name, value, options);
    return { ok: true };
  }
}
