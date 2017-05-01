import { Module } from './../../src/';
import { UsersModule } from './users/users.module';
import { ClientController } from './client/client.controller';

@Module({
    modules: [ UsersModule ],
    controllers: [ ClientController ],
})
export class ApplicationModule {}