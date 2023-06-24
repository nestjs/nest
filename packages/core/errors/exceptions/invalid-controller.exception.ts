import { USING_INVALID_CLASS_AS_A_CONTROLLER_MESSAGE } from '../messages';
import { RuntimeException } from './runtime.exception';

export class InvalidControllerException extends RuntimeException {
  constructor(metatypeUsedAsAController: any) {
    super(
      USING_INVALID_CLASS_AS_A_CONTROLLER_MESSAGE(metatypeUsedAsAController),
    );
  }
}
