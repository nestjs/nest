import {
  Body,
  Controller,
  Delete,
  Get,
  Head,
  Header,
  HttpCode,
  Options,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { HelloService } from './hello.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserByIdPipe } from './pipes/user-by-id.pipe';

@Controller('hello')
export class HelloController {
  constructor(private readonly helloService: HelloService) {}

  @Get()
  @Header('Authorization', 'Bearer')
  greeting(): string {
    return this.helloService.greeting();
  }

  @Get('async')
  async asyncGreeting(): Promise<string> {
    return this.helloService.greeting();
  }

  @Get('stream')
  streamGreeting(): Observable<string> {
    return of(this.helloService.greeting());
  }

  @Get('param/:id')
  getWithParam(@Param('id') id: string): { id: string } {
    return { id };
  }

  @Get('query')
  getWithQuery(@Query('name') name: string): { name: string } {
    return { name };
  }

  @Get('full-query')
  getWithFullQuery(@Query() query: Record<string, any>): Record<string, any> {
    return query;
  }

  @Post('body')
  @HttpCode(201)
  postWithBody(@Body() body: CreateUserDto): CreateUserDto {
    return body;
  }

  @Put('body/:id')
  putWithBody(
    @Param('id') id: string,
    @Body() body: CreateUserDto,
  ): { id: string; body: CreateUserDto } {
    return { id, body };
  }

  @Get('req')
  getWithReq(@Req() req: any): { method: string; url: string } {
    return {
      method: req.method,
      url: req.url,
    };
  }

  @Get('res')
  getWithRes(@Res() res: any): void {
    res.statusCode = 200;
    res.end('Response from @Res()');
  }

  @Get('res-passthrough')
  getWithResPassthrough(@Res({ passthrough: true }) res: any): {
    passthrough: boolean;
  } {
    res.setHeader('X-Custom-Header', 'custom-value');
    return { passthrough: true };
  }

  @Get('h3-event')
  getH3Event(@Req() req: any): { hasH3Event: boolean } {
    return { hasH3Event: !!req.h3Event };
  }

  @Get('local-pipe/:id')
  localPipe(@Param('id', UserByIdPipe) user: any): any {
    return user;
  }

  @Delete('resource/:id')
  deleteResource(@Param('id') id: string): { deleted: string } {
    return { deleted: id };
  }

  @Patch('resource/:id')
  patchResource(
    @Param('id') id: string,
    @Body() body: Partial<CreateUserDto>,
  ): { id: string; patched: Partial<CreateUserDto> } {
    return { id, patched: body };
  }

  @Head('resource')
  headResource(): void {
    // HEAD requests should return no body, just headers
    return;
  }

  @Options('resource')
  optionsResource(): { methods: string[] } {
    return {
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
    };
  }
}
