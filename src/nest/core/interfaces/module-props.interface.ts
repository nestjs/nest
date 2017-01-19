import { AppModule, Route } from "./";

export interface ModuleProps {
    modules?: AppModule[],
    components?: any[],
    routes?: Route[],
    exports?: any[],

}
