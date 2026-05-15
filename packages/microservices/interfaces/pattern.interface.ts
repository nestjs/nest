export type MsFundamentalPattern = string | number;
export type MsPatternMatch = RegExp;

export interface MsObjectPattern {
  [key: string]: MsFundamentalPattern | MsObjectPattern;
}

export type MsPattern = MsObjectPattern | MsFundamentalPattern | MsPatternMatch;
