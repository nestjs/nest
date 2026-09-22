import { Controller, Post } from '@nestjs/common';

/**
 * Only `POST hooks/github` is excluded from the CSRF protection. The other
 * routes are reachable through paths that a lenient exclusion would match
 * (`/hooks/github/` and `/hooks/GITHUB` on Fastify).
 */
@Controller('hooks')
export class HooksController {
  @Post('github')
  github() {
    return { handler: 'github' };
  }

  @Post('github/:event')
  githubEvent() {
    return { handler: 'github/:event' };
  }

  @Post(':provider')
  provider() {
    return { handler: ':provider' };
  }
}
