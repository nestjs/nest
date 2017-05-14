import { Module, Shared } from './../../../src/';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthMiddleware } from './auth.middleware';
import { NestModule, MiddlewaresConsumer } from '../../../src/common/index';
import { ChatGateway } from './chat.gateway';

@Module({
    controllers: [ UsersController ],
    components: [
        UsersService,
        ChatGateway,
    ],
})
export class UsersModule implements NestModule {
    public configure(consumer: MiddlewaresConsumer) {
        consumer.apply(AuthMiddleware).forRoutes(UsersController);
    }
}
