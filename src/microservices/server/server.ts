export abstract class Server {
    protected readonly msgHandlers = {};

    abstract listen(callback: () => void);

    add(pattern, callback) {
        this.msgHandlers[JSON.stringify(pattern)] = callback;
    }

    protected handleError(error) {
        console.log(error);
    }
}