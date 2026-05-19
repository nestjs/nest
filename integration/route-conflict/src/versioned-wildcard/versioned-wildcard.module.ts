import { Module } from '@nestjs/common';
import { UsersMeController } from './users-me.controller.js';
import { UsersWildcardController } from './users-wildcard.controller.js';

// Two controllers that share the `users` path under URI versioning:
//   - `UsersMeController`    → GET /v1/users/me        (literal)
//   - `UsersWildcardController.catchAll` (versioned)
//                            → GET /v1/users/*path     (named wildcard)
//   - `UsersWildcardController.profile` (unversioned)
//                            → GET /users/profile
//
// Exercises the combination that no other integration fixture covers:
// Fastify + URI versioning + a named wildcard sharing a prefix with a
// literal route + deferred adapter registration (triggered by any
// non-empty `routeConflictPolicy`).
@Module({
  controllers: [UsersMeController, UsersWildcardController],
})
export class VersionedWildcardModule {}
