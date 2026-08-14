import { Body, Controller } from '@nestjs/common';
import { QueryMethod } from '@nestjs/common';

interface SearchFilters {
  name?: string;
  page?: number;
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
}
