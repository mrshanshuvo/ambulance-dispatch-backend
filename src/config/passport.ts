import passport from "passport";
import {
  Strategy as GoogleStrategy,
  type Profile,
} from "passport-google-oauth20";
import { prisma } from "./db";

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:
          process.env.GOOGLE_CALLBACK_URL ||
          "http://localhost:5000/api/v1/auth/google/callback",
      },
      async (_accessToken, _refreshToken, profile: Profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error("No email returned from Google profile"));
          }
          const googleId = profile.id;

          // Upsert user by Google ID or email
          let user = await prisma.user.findFirst({
            where: { OR: [{ googleId }, { email }] },
          });

          if (!user) {
            user = await prisma.user.create({
              data: {
                name: profile.displayName || "Google User",
                email,
                googleId,
              },
            });
          } else if (!user.googleId) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: { googleId },
            });
          }

          return done(null, { userId: user.id, role: user.role });
        } catch (error) {
          return done(error as Error);
        }
      },
    ),
  );
}

export default passport;
