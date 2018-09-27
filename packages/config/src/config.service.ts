import { Injectable, Utils } from '@nest/core';
import get = require('lodash.get');
import set = require('lodash.set');
import * as fs from 'fs-extra';
import * as glob from 'glob';
import * as path from 'path';
import YAML from 'yaml';

@Injectable()
export class ConfigService {
  private config: any;

  private parseContent({ ext }: path.ParsedPath, content: string) {
    switch (ext) {
      case '.yaml':
      case '.yml':
        return YAML.parse(content);

      case '.json':
        return JSON.parse(content);
    }
  }

  public async load(globPath?: string) {
    const files = await Utils.promisify(glob)<string[]>(globPath);

    await Promise.all(
      files.map(async file => {
        const parsedFile = path.parse(file);
        const content = await fs.readFile(file, 'utf8');
        const config = this.parseContent(parsedFile, content);

        this.set(parsedFile.name, config);
      }),
    );
  }

  public get<T>(key: string = '', def?: any): T {
    return get(this.config, key) || def;
  }

  public set(key: string = '', value: any) {
    set(this.config, key, value);
  }
}
