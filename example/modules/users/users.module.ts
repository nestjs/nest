import { Module } from './../../../src/';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { MiddlewareBuilder } from '../../../src/core/middlewares/builder';
import { AuthMiddleware } from './auth.middleware';

@Module({
    controllers: [ UsersController ],
    components: [
        UsersService
    ],
})
export class UsersModule {
    getContext() {
        return 'Test';
    }

    configure(builder: MiddlewareBuilder) {
       builder.apply(AuthMiddleware)
            .with('admin', 'creator', 'editor')
            .forRoutes(UsersController);

       /* builder.use({
            middlewares: [
               AuthMiddleware
            ],
            forRoutes: [ UsersController ]
        });*/
    }
}


