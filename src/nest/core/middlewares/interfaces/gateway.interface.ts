export interface Gateway {
    onInit: (server: any) => void;
    connection: (client: any) => void;
}