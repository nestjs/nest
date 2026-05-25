import { IFile } from './interfaces/index.js';

export type FileValidatorContext<TConfig> = {
  file?: IFile;
  config: TConfig;
};
