const passport = require('passport');
const { emitLog } = require('../utils/logger');

module.exports = app => {
    app.get(
        '/auth/google',
        passport.authenticate('google', {
            scope: ['profile', 'email']
        })
    );

    app.get(
        '/auth/google/callback',
        passport.authenticate('google'),
        (req, res) => {
            // #region agent log
            emitLog({
                hypothesisId: 'H1',
                location: 'server/routes/authRoutes.js:google-callback',
                message: 'Post-auth callback session/user state',
                data: {
                    hasSession: !!req.session,
                    hasRegenerate: !!(req.session && req.session.regenerate),
                    hasSave: !!(req.session && req.session.save),
                    sessionKeys: req.session ? Object.keys(req.session) : [],
                    userId: req.user ? req.user.id : null
                }
            });
            // #endregion
            // Redirect to frontend dashboard or home
            res.redirect('http://localhost:5173/dashboard');
        }
    );

    app.get('/api/logout', (req, res, next) => {
        req.logout((err) => {
            if (err) { return next(err); }
            res.redirect('http://localhost:5173/');
        });
    });

    app.get('/api/current_user', (req, res) => {
        res.send(req.user);
    });
};
