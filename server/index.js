const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const { emitLog } = require('./utils/logger');
require('dotenv').config();
require('./models/User');
require('./services/passport');

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

const app = express();

app.use(cors({
    origin: 'http://localhost:5173', // Vite default port
    credentials: true
}));

app.use(
    session({
        secret: process.env.COOKIE_KEY || 'your-secret-key',
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 30 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            secure: false // Set to true if using HTTPS
        }
    })
);
// #region agent log
app.use((req, _res, next) => {
    emitLog({
        hypothesisId: 'H1',
        location: 'server/index.js:pre-passport',
        message: 'Incoming request session shape',
        data: {
            url: req.url,
            method: req.method,
            hasSession: !!req.session,
            hasRegenerate: !!(req.session && req.session.regenerate),
            hasSave: !!(req.session && req.session.save),
            sessionKeys: req.session ? Object.keys(req.session) : []
        }
    });
    next();
});
// #endregion
app.use(passport.initialize());
app.use(passport.session());

require('./routes/authRoutes')(app);

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
