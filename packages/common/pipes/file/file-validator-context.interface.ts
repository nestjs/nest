import { IFile } from './interfaces';

export type FileValidatorContext<TConfig> = {
  file?: IFile;
  config: TConfig;
};
