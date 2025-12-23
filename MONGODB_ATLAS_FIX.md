# MongoDB Atlas IP Whitelist Fix for Vercel Deployment

## Problem
The Google login callback was timing out with these errors:
- **MongooseError**: Operation `users.findOne()` buffering timed out after 10000ms
- **MongoDB connection error**: Could not connect to any servers in MongoDB Atlas cluster
- **Vercel timeout**: Task timed out after 300 seconds

**Root Cause**: Vercel's serverless functions use dynamic IPs that weren't whitelisted in MongoDB Atlas.

## Solution

### Option 1: Allow All IPs (Quick Fix - Development/Small Projects)

1. Go to [MongoDB Atlas Dashboard](https://cloud.mongodb.com)
2. Select your Project → Network Access (in left sidebar)
3. Click "EDIT" on your current IP Whitelist entry
4. Change the IP to `0.0.0.0/0` (allows all IPs)
5. Click "Confirm"

⚠️ **Security Note**: This allows anyone with your connection string to access the database. Only use for development.

### Option 2: Use Connection String IP Restrictions (Recommended for Production)

1. Go to MongoDB Atlas Dashboard → Network Access
2. Click "ADD IP ADDRESS"
3. Select "Allow access from anywhere" → `0.0.0.0/0`
4. **Important**: Protect your `MONGO_URI` in `.env` file - never commit it to Git
5. In Vercel, ensure `MONGO_URI` is set as an environment variable in project settings

### Option 3: Use Vercel's Static IPs (Enterprise)

If using Vercel Pro with static IPs:
1. Get your static IP from Vercel project settings
2. Add it to MongoDB Atlas whitelist under Network Access
3. Set: `IP Address: [YOUR_VERCEL_IP]`

## Code Changes Made

### 1. **Connection Pooling** (`server/index.js`)
```javascript
- Timeout: 5000ms for server selection (reduced from default 30s)
- Socket timeout: 10000ms per operation
- Pool: 10 max, 5 min connections
```

### 2. **Timeout Handling** (`server/services/passport.js`)
```javascript
- Added 8-second timeout for DB operations
- Graceful error handling instead of hanging
- Fallback response if timeout occurs
```

### 3. **Error Handling** (`server/routes/authRoutes.js`)
```javascript
- 25-second timeout for auth callback (before 300s Vercel limit)
- Detailed error responses
- Proper session login with error handling
```

## Testing

After deploying:

1. **Test Google Login**: Try signing in with Google
2. **Check logs**: 
   ```bash
   vercel logs <url> --follow
   ```
3. **Look for**: 
   - "MongoDB connected" message
   - Success response instead of 504 timeout

## Troubleshooting

### Still getting timeout errors?

1. **Verify MONGO_URI** in Vercel environment variables
2. **Check whitelist status**:
   ```bash
   # Ping MongoDB endpoint (if you have netcat/nc)
   nc -zv ac-99rfizp-shard-00-00.35ntqsu.mongodb.net 27017
   ```
3. **Increase timeout** in `server/index.js` if network is very slow
4. **Check MongoDB cluster status**: Go to Atlas → Cluster → Metrics

### Performance still slow?

1. Add indexes to `users` collection:
   ```javascript
   // Run in MongoDB shell
   db.users.createIndex({ googleId: 1 })
   db.users.createIndex({ email: 1 })
   ```
2. Use connection pooling (already done in the fix)
3. Consider upgrading MongoDB cluster tier for better performance

## Environment Variables Required

Make sure these are set in Vercel project settings:
```
MONGO_URI=mongodb+srv://[user]:[password]@[cluster].mongodb.net/[database]?retryWrites=true&w=majority
GOOGLE_CLIENT_ID=xxxxx
GOOGLE_CLIENT_SECRET=xxxxx
COOKIE_KEY=xxxxx
```

## References
- [MongoDB Atlas Network Access](https://docs.mongodb.com/manual/reference/connection-string/#ip-allowlist)
- [Mongoose Connection Pooling](https://mongoosejs.com/docs/connections.html#connection-pooling)
- [Vercel Function Timeout](https://vercel.com/docs/concepts/functions/serverless-functions#max-duration)
