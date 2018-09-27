export interface IpfsConfig {
  pass: string;
  repo?: string;
  keys?: {
    type: 'RSA';
    size: 1024 | 2048 | 4096;
  };
}
