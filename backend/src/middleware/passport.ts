import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { env } from '../config/env';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: env.jwt.secret,
    },
    async (payload, done) => {
      try {
        const user = await AppDataSource.getRepository(User).findOneBy({ id: payload.sub });
        return done(null, user ?? false);
      } catch (err) {
        return done(err, false);
      }
    }
  )
);

// Only registered when OAuth credentials are configured — keeps local dev working without them.
if (env.googleOAuth.clientId && env.googleOAuth.clientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.googleOAuth.clientId,
        clientSecret: env.googleOAuth.clientSecret,
        callbackURL: env.googleOAuth.callbackUrl,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const userRepo = AppDataSource.getRepository(User);
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('Google profile did not return an email'), false);
          }

          let user = await userRepo.findOneBy({ email });
          if (!user) {
            user = userRepo.create({
              email,
              fullName: profile.displayName,
              oauthProvider: 'google',
              oauthId: profile.id,
            });
            await userRepo.save(user);
          }

          return done(null, user);
        } catch (err) {
          return done(err as Error, false);
        }
      }
    )
  );
}

export default passport;
