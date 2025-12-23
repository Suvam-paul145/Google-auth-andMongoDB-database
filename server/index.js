const express = require('express');
const mongoose = require('mongoose');
const cookieSession = require('cookie-session');
const passport = require('passport');
const cors = require('cors');
const { emitLog } = require('./utils/logger');
require('dotenv').config();
require('./models/User');
require('./services/passport');

// MongoDB connection with proper timeout handling
let isMongoConnected = false;
let mongoConnectPromise = null;

const connectMongoDB = async () => {
    if (isMongoConnected) return;
    if (mongoConnectPromise) return mongoConnectPromise;

    mongoConnectPromise = mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 10000,
        maxPoolSize: 10,
        minPoolSize: 5,
        retryWrites: true,
        w: 'majority'
    })
        .then(() => {
            console.log('MongoDB connected');
            isMongoConnected = true;
            return true;
        })
        .catch(err => {
            console.error('MongoDB connection error:', err.message);
            mongoConnectPromise = null;
            throw err;
        });

    return mongoConnectPromise;
};

// Initial connection attempt (non-blocking)
connectMongoDB().catch(err => console.log('Initial MongoDB connection attempt failed:', err.message));

const app = express();
app.set('trust proxy', 1);

app.use(cors({
    origin: 'http://localhost:5173', // Vite default port
    credentials: true
}));

app.use(
    cookieSession({
        maxAge: 30 * 24 * 60 * 60 * 1000,
        keys: [process.env.COOKIE_KEY]
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
// Ensure MongoDB is connected before processing critical requests
app.use(async (req, res, next) => {
    // Skip connection check for non-auth routes
    if (req.path === '/api/current_user' || req.path.includes('/auth/')) {
        try {
            if (!isMongoConnected) {
                await connectMongoDB();
            }
        } catch (error) {
            console.error('MongoDB connection check failed:', error.message);
            return res.status(503).json({ error: 'Database connection unavailable' });
        }
    }
    next();
});

app.use(passport.initialize());
app.use(passport.session());

require('./routes/authRoutes')(app);

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// Export helper for serverless environment
module.exports = app;
module.exports.connectMongoDB = connectMongoDB;
