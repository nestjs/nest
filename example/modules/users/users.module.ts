import { Module } from './../../../src/';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthMiddleware } from './auth.middleware';
import { MiddlewareBuilder } from '../../../src/core/middlewares/builder';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { NotificationService } from './notification.service';

@Module({
    controllers: [ UsersController ],
    components: [ UsersService, ChatGateway, ChatService, NotificationService ],
    exports: [ UsersService ],
})
export class UsersModule {
    configure(builder: MiddlewareBuilder) {
        builder.use({
            middlewares: [ AuthMiddleware ],
            forRoutes: [ UsersController ],
        })
    }
}
