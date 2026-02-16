import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

@Injectable()
export class DatabaseConnection implements OnModuleDestroy {
  keepAlive = true;

  static connect(): DatabaseConnection {
    const connection = new DatabaseConnection();
    connection.maintainConnection();
    return connection;
  }

  onModuleDestroy() {
    this.keepAlive = false;
  }

  maintainConnection() {
    setTimeout(() => {
      if (this.keepAlive) {
        this.maintainConnection();
      }
    }, 10);
  }
}
