import { Controller, Get, Inject } from '@nestjs/common';
import { ON_PREMISE_DB_CONNECTION } from './db-conf/client-db-connections.module';
import { DataSource } from 'typeorm';

@Controller('/products')
export class ProductController {
  constructor(
    @Inject(ON_PREMISE_DB_CONNECTION) private readonly dataSource: DataSource,
  ) {}

  @Get('all')
  async getAll(): Promise<any> {
    return await this.dataSource.manager.query(`select * from product`);
  }
}
