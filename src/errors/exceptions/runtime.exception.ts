export class RuntimeException extends Error {
    constructor(private msg: string) {
        super();
    }

    what() {
        return this.msg;
    }
}