export interface PointOfViewOptions {
  engine?: {
    [name: string]: any;
  };
  templates: string;
  includeViewExtension?: boolean;
  options: {
    [name: string]:
      | {
          [name: string]: any;
        }
      | any;
  };
}
