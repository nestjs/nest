import * as express from 'express';
import { UsersService } from './users.service';
import { Controller, Response, Body, Param, Query } from './../../../src/';
import { Get, Post } from '../../../src/common/utils/decorators/request-mapping.decorator';
import { UsePipes } from '../../../src/common/utils/decorators/use-pipes.decorator';
import { HttpStatus } from '../../../src/common/index';
import { UseFilters } from '../../../src/common/utils/decorators/exception-filters.decorator';
import { CustomExceptionFilter, CustomException } from './exception.filter';
import { ValidatorPipe } from './validator.pipe';

@Controller('users')
@UseFilters(new CustomExceptionFilter())
export class UsersController {
    constructor(private usersService: UsersService) {}

    @Get()
    public async getAllUsers(@Response() res: express.Response) {
        const users = await this.usersService.getAllUsers();
        res.status(HttpStatus.OK).json(users);
    }

    @Get('/:id')
    @UsePipes(new ValidatorPipe())
    public async getUser(@Response() res: express.Response, @Param('id') id: string) {
        const user = await this.usersService.getUser(id);
        res.status(HttpStatus.OK).json(user);
    }

    @Post()
    @UsePipes(new ValidatorPipe())
    public async addUser(@Response() res: express.Response, @Body('user') user: string, @Body('xd') xd: number, @Query('ha') ha: boolean) {
        const msg = await this.usersService.getUser(user);
        res.status(HttpStatus.CREATED).json(msg);
    }
}
