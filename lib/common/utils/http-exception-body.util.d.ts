export declare const createHttpExceptionBody: (message: any, error: string, status: number) => {
    statusCode: number;
    error: string;
    message: any;
} | {
    statusCode: number;
    error: string;
    message?: undefined;
};
