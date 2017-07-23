import { Guard, CanActivate } from '@nestjs/common';

@Guard()
export class RolesGuard implements CanActivate {
    public async canActivate() {
        return await Promise.resolve(true);
    }
}