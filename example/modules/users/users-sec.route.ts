import { Request, Response, NextFunction } from "express";
import { RequestMapping, RequestMethod} from "./../../../src/";
import { UsersQueryService } from "./users-query.service";
import { Controller } from "./../../../src/";

@Controller({ path: "users" })
export class UsersSecRoute {

    constructor(private usersQueryService: UsersQueryService) {
        this.usersQueryService.stream$.subscribe((xd) => {
            console.log(xd);
        });
    }

    /*@RequestMapping({
        path: "/",
        method: RequestMethod.GET
    })
    async getAllUsers(req: Request, res: Response, next: NextFunction) {
        try {
            const users = await this.usersQueryService.getAllUsers();
            res.status(201).json(users);
            next();
        }
        catch(e) {
            next(e.message);
        }
    }*/

}

