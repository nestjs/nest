import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ClientDbConnectionsModule } from './db-conf/client-db-connections.module';
import { MainDbConnectionModule } from './db-conf/main-db-connection.module';

@Module({
  imports: [ClientDbConnectionsModule, MainDbConnectionModule],
  controllers: [ProductController],
})
export class AppModule {}
