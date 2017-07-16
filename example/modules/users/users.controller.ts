import { Response } from 'express';
import { UsersService } from './users.service';
import { Controller, Res, Body, Param, Query } from './../../../src/';
import { Get, Post } from '../../../src/common/utils/decorators/request-mapping.decorator';
import { UsePipes } from '../../../src/common/utils/decorators/use-pipes.decorator';
import { HttpStatus } from '../../../src/common/index';
import { UseFilters } from '../../../src/common/utils/decorators/exception-filters.decorator';
import { CustomExceptionFilter } from '../../common/exception.filter';
import { ValidatorPipe } from '../../common/validator.pipe';
import { UseGuards } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

@Controller('users')
@UseFilters(new CustomExceptionFilter())
export class UsersController {
    constructor(private usersService: UsersService) {}

    @Get()
    @UseGuards(RolesGuard)
    public async getAllUsers(@Res() res: Response) {
        const users = await this.usersService.getAllUsers();
        res.status(HttpStatus.OK).json(users);
    }

    @Get('/:id')
    public async getUser(@Res() res: Response, @Param('id') id: string) {
        const user = await this.usersService.getUser(id);
        res.status(HttpStatus.OK).json(user);
    }

    @Post()
    @UsePipes(new ValidatorPipe())
    public async addUser(@Res() res: Response, @Body('user') user: string) {
        const msg = await this.usersService.addUser(user);
        res.status(HttpStatus.CREATED).json(msg);
    }
}
