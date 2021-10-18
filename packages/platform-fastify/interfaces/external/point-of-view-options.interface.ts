/**
 * @see https://github.com/fastify/point-of-view/blob/master/index.d.ts
 */

export interface PointOfViewOptions {
  engine: {
    ejs?: any;
    eta?: any;
    nunjucks?: any;
    pug?: any;
    handlebars?: any;
    marko?: any;
    mustache?: any;
    'art-template'?: any;
    twig?: any;
    liquid?: any;
    dot?: any;
  };
  templates?: string;
  includeViewExtension?: boolean;
  options?: object;
  charset?: string;
  maxCache?: number;
  production?: boolean;
  defaultContext?: object;
  layout?: string;
  root?: string;
  viewExt?: string;
  propertyName?: string;
}
