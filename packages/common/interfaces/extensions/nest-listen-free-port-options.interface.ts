export interface INestListenFreePortOptions {
  port: string | number;
  onSkip: (port: number) => boolean;
  onStart: (port: number) => boolean;
}
