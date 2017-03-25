import { UsersService } from "./users.service";
import { RequestMethod, Controller, RequestMapping } from "./../../../src/";
import { ModuleRef } from '../../../src/core/injector/module-ref';
import { UsersModule } from './users.module';

@Controller({ path: 'users' })
export class UsersController {

    constructor(
        private usersService: UsersService,
        private moduleRef: ModuleRef) {}

    @RequestMapping()
    async getAllUsers(req, res) {
        const users = await this.usersService.getAllUsers();
        res.status(200).json(users);
    }

    @RequestMapping({ path: '/:id' })
    async getUser(req, res) {
        const user = await this.usersService.getUser(req.params.id);
        res.status(200).json(user);
    }

    @RequestMapping({ method: RequestMethod.POST })
    async addUser(req, res) {
        const msg = await this.usersService.getUser(req.body.user);
        res.status(201).json(msg);
    }

}



