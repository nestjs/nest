export interface ExceptionFilter {
    catch(exception: any, response: any): any;
}
