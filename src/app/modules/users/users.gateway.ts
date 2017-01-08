import { SocketGateway } from "../../../nest/socket/utils";
import { Gateway } from "../../../nest/socket/interfaces";

@SocketGateway()
export class UsersGateway implements Gateway {

    constructor() {
        console.log("Gateway listen");
    }

    onInit(server) {
        console.log("Server initialized");
    }

    connection(client) {
        console.log("Client connected");
    }

}