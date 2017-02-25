import { UsersService } from "./users.service";
import { HttpException } from '../../../src/core/exceptions/http-exception';
import { Middleware } from '../../../src/common/utils';
import { NestMiddleware } from '../../../src/core/middlewares/interfaces/nest-middleware.interface';

@Middleware()
export class AuthMiddleware implements NestMiddleware {

    constructor(private usersService: UsersService) {}

    resolve() {
        return (req, res, next) => {
            const userName = req.headers["x-access-token"];
            const users = this.usersService.getUsers();

            const user = users.find((user) => user.name === userName);
            if (!user) {
                throw new HttpException('User not found.', 401);
            }
            req.user = user;
            next();
        }
    }

}

