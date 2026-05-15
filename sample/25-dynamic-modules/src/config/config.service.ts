import { Inject, Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { CONFIG_OPTIONS } from './constants.js';
import { ConfigOptions, EnvConfig } from './interfaces/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

@Injectable()
export class ConfigService {
  private readonly envConfig: EnvConfig;

  constructor(@Inject(CONFIG_OPTIONS) options: ConfigOptions) {
    const filePath = `${process.env.NODE_ENV || 'development'}.env`;
    const envFile = path.resolve(__dirname, '../../', options.folder, filePath);
    this.envConfig = dotenv.parse(fs.readFileSync(envFile));
  }

  get(key: string): string {
    return this.envConfig[key];
  }
}
