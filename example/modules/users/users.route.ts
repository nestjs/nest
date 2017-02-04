import { Request, Response, NextFunction } from "express";
import { UsersQueryService } from "./users-query.service";
import { RequestMethod, Controller, Exception, RequestMapping } from "./../../../src/";

class NotFoundException extends Exception {
    constructor(msg: string) {
        super(`Not found ${msg}`, 401);
    }
}

@Controller({ path: "users" })
export class UsersRoute {

    get dependencies() {
        return [ UsersQueryService ];
    }
    constructor(
        private usersQueryService: UsersQueryService) {

        //console.log(usersQueryService);
        this.usersQueryService.stream$.subscribe((xd) => {
            ///console.log(xd);
        });
    }

    @RequestMapping({
        path: "/",
        method: RequestMethod.GET
    })
    getAllUsers(req: Request, res: Response, next: NextFunction) {
        throw new NotFoundException("user");
       /* try {
            //const users = await this.usersQueryService.getAllUsers();
            res.status(201).json({
                data: [
                    { name: "Todo 1", status: 3 },
                    { name: "Todo 2", status: 0 },
                    { name: "Todo 3", status: 2 },
                ],
            });
            next();
        }
        catch(e) {
            next(e.message);
        }*/
    }

    @RequestMapping({
        path: "/",
        method: RequestMethod.POST
    })
    async addTodoItem(req: Request, res: Response) {
        try {
            console.log(req.body);
            res.status(201).json({});
            //const users = await this.usersQueryService.getAllUsers();
            /*res.status(201).json({
                data: [
                    { name: "Todo 1", status: 3 },
                    { name: "Todo 2", status: 0 },
                    { name: "Todo 3", status: 2 },
                ],
            });*/
        }
        catch(e) {}
    }

}

