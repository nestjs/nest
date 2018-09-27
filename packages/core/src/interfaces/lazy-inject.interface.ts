import { TargetRef } from './target-ref.interface';
import { ForwardRef } from './forward-ref.interface';
import { Token } from './token.interface';

export type TLazyInject = (
  serviceIdentifier: Token,
) => (proto: any, key: string) => void;

export interface ILazyInject extends TargetRef {
  forwardRef: ForwardRef;
  lazyInject: (lazyInject: TLazyInject, provider: Token) => any;
}
