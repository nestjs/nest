import { Module } from './../../src/';
import { UsersModule } from './users/users.module';

@Module({
    modules: [ UsersModule ]
})
export class ApplicationModule {}