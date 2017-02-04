import { Gateway, SubscribeMessage, SocketServer, SocketGateway } from "./../../../src/socket";
import { UsersQueryService } from "./users-query.service";
import { Component } from "./../../../src/";

@Component()
@SocketGateway({ namespace: "" })
export class UsersGateway implements Gateway {

    static get dependencies() {
        return [ UsersQueryService ];
    }

    @SocketServer
    private server;

    constructor(private queryService: UsersQueryService) {
        console.log("Gateway listen");
        this.queryService.stream$.subscribe((xd) => {
            console.log(xd);
        });
    }

    afterInit(server) {
        this.server = server;
        console.log("Server initialized");
    }

    handleConnection(client) {
        console.log("Client connected");
        setTimeout(() => {
            client.emit("msg", { msg: "Hello from the server!" });
        }, 2000);
        /*
        client.on("msg", (data) => {
            console.log(data);
            client.emit("msg", { msg: data.msg });
            client.broadcast.emit("msg", { msg: data.msg });
        });*/
    }

    handleDisconnect(client) {
        console.log("Client disconnected ");
    }

    @SubscribeMessage({ value: "msg" })
    msgHandler(client, data) {
        console.log(data);
    }
}