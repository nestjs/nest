import { UsersService } from "./users.service";
import { RequestMethod, Controller, RequestMapping } from "./../../../src/";
import { ModuleRef } from '../../../src/core/injector/module-ref';
import { UsersModule } from './users.module';
import { Get, Post } from '../../../src/common/utils/request-mapping.decorator';

@Controller({ path: 'users' })
export class UsersController {

    constructor(
        private usersService: UsersService,
        private moduleRef: ModuleRef) {}

    @Get()
    async getAllUsers(req, res) {
        const users = await this.usersService.getAllUsers();
        res.status(200).json(users);
    }

    @Get('/:id')
    async getUser(req, res) {
        const user = await this.usersService.getUser(req.params.id);
        res.status(200).json(user);
    }

    @Post()
    async addUser(req, res) {
        const msg = await this.usersService.getUser(req.body.user);
        res.status(201).json(msg);
    }

}



