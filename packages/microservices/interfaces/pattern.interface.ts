export type MsFundamentalPattern = string | number;

export interface MsObjectPattern {
  [key: string]: MsFundamentalPattern | MsObjectPattern;
}

export type MsPattern = MsObjectPattern | MsFundamentalPattern;
