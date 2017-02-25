export declare class Error {
    public name: string;
    public message: string;
    public stack: string;
    constructor(message?: string);
}

export class RuntimeException extends Error {
    constructor(private msg = ``) {
        super(msg);
    }

    what() {
        return this.msg;
    }
}