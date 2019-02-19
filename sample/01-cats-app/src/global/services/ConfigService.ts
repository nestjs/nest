import * as dotenv from 'dotenv';

export class ConfigService {
  private readonly envConfig: { [key: string]: string };

  constructor() {
    dotenv.load();
    this.envConfig = dotenv.config().parsed;
  }

  get(key: string): string | undefined {
    return this.envConfig[key];
  }

  getNumber(key: string): number | undefined {
    if (this.envConfig[key] === null || this.envConfig[key] === undefined) {
      return undefined;
    }

    return Number.parseInt(this.envConfig[key]);
  }

  getBoolean(key: string): boolean | undefined {
    if (this.envConfig[key] === null || this.envConfig[key] === undefined) {
      return undefined;
    }

    return this.envConfig[key].toLowerCase() === 'true';
  }
}