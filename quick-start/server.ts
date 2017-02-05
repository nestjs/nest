import { NestRunner, NestApplication, Module } from "nest";
import { Controller } from "../src/common/utils/controller.decorator";
import { RequestMapping } from "../src/common/utils/request-mapping.decorator";

export class Application implements NestApplication {
    constructor(private application) {}

    start() {
        this.application.listen(3030, () => {
            console.log("Application listen on port:", 3030);
        });
    }
}

@Controller({ path: "users" })
class UsersController {

    @RequestMapping({ path: "/" })
    getAllUsers(res, req, next) {
        res.status(201).json({});
    }

}

@Module({})
export class ApplicationModule {}

NestRunner.run(Application, ApplicationModule);