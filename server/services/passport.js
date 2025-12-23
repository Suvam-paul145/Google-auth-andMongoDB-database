const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mongoose = require('mongoose');
const { emitLog } = require('../utils/logger');

const User = mongoose.model('users');

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id).then(user => {
        done(null, user);
    });
});

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: '/auth/google/callback',
            proxy: true
        },
        async (accessToken, refreshToken, profile, done) => {
            const existingUser = await User.findOne({ googleId: profile.id });

            if (existingUser) {
                // #region agent log
                emitLog({
                    hypothesisId: 'H2',
                    location: 'server/services/passport.js:verify',
                    message: 'Existing user found',
                    data: { userId: existingUser.id }
                });
                // #endregion
                return done(null, existingUser);
            }

            const user = await new User({
                googleId: profile.id,
                displayName: profile.displayName,
                email: profile.emails[0].value
            }).save();
            // #region agent log
            emitLog({
                hypothesisId: 'H2',
                location: 'server/services/passport.js:verify',
                message: 'New user created',
                data: { userId: user.id }
            });
            // #endregion
            done(null, user);
        }
    )
);
