import * as passport from 'passport';

export abstract class PassportSerializer {
  abstract serializeUser(user: any, done: Function);
  abstract deserializeUser(payload: any, done: Function);

  constructor() {
    passport.serializeUser((user, done) => this.serializeUser(user, done));
    passport.deserializeUser((payload, done) =>
      this.deserializeUser(payload, done),
    );
  }
}
