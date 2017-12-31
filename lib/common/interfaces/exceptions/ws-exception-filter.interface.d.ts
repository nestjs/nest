export interface WsExceptionFilter {
    catch(exception: any, client: any): any;
}
