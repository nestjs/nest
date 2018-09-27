export interface FastifyStaticAssets {
  root: string;
  prefix?: string;
  setHeaders?: Function;
  send?: any;
}
