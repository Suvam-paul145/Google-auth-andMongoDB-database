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
        (req, res, next) => {
            // Set a timeout for the auth callback
            const authTimeout = setTimeout(() => {
                console.error('Auth callback timeout after 25 seconds');
                return res.status(504).json({ 
                    error: 'Authentication timeout. Please try again.',
                    retry: true 
                });
            }, 25000); // 25 seconds before Vercel's 300s timeout

            passport.authenticate('google', { session: true }, (err, user, info) => {
                clearTimeout(authTimeout);
                
                if (err) {
                    console.error('Passport auth error:', err.message);
                    return res.status(500).json({ 
                        error: 'Authentication failed',
                        details: err.message 
                    });
                }
                
                if (!user) {
                    console.warn('No user returned from auth');
                    return res.status(401).json({ 
                        error: 'Authentication failed',
                        info 
                    });
                }

                req.login(user, (loginErr) => {
                    if (loginErr) {
                        console.error('Session login error:', loginErr.message);
                        return res.status(500).json({ 
                            error: 'Session creation failed' 
                        });
                    }

                    emitLog({
                        hypothesisId: 'H1',
                        location: 'server/routes/authRoutes.js:google-callback',
                        message: 'Post-auth callback session/user state',
                        data: {
                            hasSession: !!req.session,
                            userId: req.user ? req.user.id : null,
                            success: true
                        }
                    });
                    
                    // Redirect to frontend dashboard
                    res.redirect('http://localhost:5173/dashboard');
                });
            })(req, res, next);
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
