import {
  ArgumentsHost,
  BadRequestException,
  Body,
  CallHandler,
  CanActivate,
  Catch,
  Controller,
  ExceptionFilter,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Param,
  PipeTransform,
  Query,
  QueryMethod,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { map } from 'rxjs/operators';

interface SearchFilters {
  name?: string;
  page?: number;
}

@Injectable()
export class AllowGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}

@Injectable()
export class TagInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    return next
      .handle()
      .pipe(map(result => ({ ...result, intercepted: true })));
  }
}

@Injectable()
export class UppercasePipe implements PipeTransform {
  transform(value: string) {
    return typeof value === 'string' ? value.toUpperCase() : value;
  }
}

@Catch(BadRequestException)
export class RejectFilter implements ExceptionFilter {
  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: BadRequestException, host: ArgumentsHost) {
    const { httpAdapter } = this.adapterHost;
    const response = host.switchToHttp().getResponse();
    httpAdapter.reply(response, { handledBy: 'RejectFilter' }, 400);
  }
}

@Controller('items')
export class QueryMethodController {
  @QueryMethod()
  findAll(@Body() filters: SearchFilters) {
    return { results: [], filters };
  }

  @QueryMethod('search')
  search(@Body() filters: SearchFilters) {
    return { endpoint: 'search', filters };
  }

  @UseFilters(RejectFilter)
  @QueryMethod('reject')
  reject(): never {
    throw new BadRequestException('nope');
  }

  // Declared after "search" and "reject" — a param route registered first
  // would shadow those literal paths.
  @UseGuards(AllowGuard)
  @UseInterceptors(TagInterceptor)
  @QueryMethod(':id')
  findOne(
    @Param('id') id: string,
    @Query('tenant', UppercasePipe) tenant: string,
    @Body() filters: SearchFilters,
  ) {
    return { id, tenant, filters };
  }
}
