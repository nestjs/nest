import { Module } from './../../src/';
import { UsersModule } from './users/users.module';
import { ClientController } from './client/client.controller';
import { Component } from '../../src/common/index';
import { UsersService } from './users/users.service';

@Module({
    modules: [ UsersModule ],
    controllers: [ ClientController ],
})
export class ApplicationModule {}