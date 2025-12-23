const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mongoose = require('mongoose');
const { emitLog } = require('../utils/logger');

const User = mongoose.model('users');

// Increase timeout for operations
const OPERATION_TIMEOUT = 8000; // 8 seconds

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Deserialize timeout')), OPERATION_TIMEOUT)
    );
    
    Promise.race([
        User.findById(id),
        timeoutPromise
    ])
        .then(user => done(null, user))
        .catch(err => {
            console.error('Deserialize error:', err.message);
            done(null, null);
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
            try {
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('FindOne timeout')), OPERATION_TIMEOUT)
                );
                
                const existingUser = await Promise.race([
                    User.findOne({ googleId: profile.id }),
                    timeoutPromise
                ]);

                if (existingUser) {
                    emitLog({
                        hypothesisId: 'H2',
                        location: 'server/services/passport.js:verify',
                        message: 'Existing user found',
                        data: { userId: existingUser.id }
                    });
                    return done(null, existingUser);
                }

                const user = await Promise.race([
                    new User({
                        googleId: profile.id,
                        displayName: profile.displayName,
                        email: profile.emails[0].value
                    }).save(),
                    timeoutPromise
                ]);
                
                emitLog({
                    hypothesisId: 'H2',
                    location: 'server/services/passport.js:verify',
                    message: 'New user created',
                    data: { userId: user.id }
                });
                done(null, user);
            } catch (err) {
                console.error('Google auth error:', err.message);
                emitLog({
                    hypothesisId: 'H2',
                    location: 'server/services/passport.js:verify',
                    message: 'Google auth error',
                    data: { error: err.message }
                });
                done(err);
            }
        }
    )
);
