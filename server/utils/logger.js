const fs = require('fs');
const path = require('path');

// Point to workspace-level .cursor directory (one level above server/)
const LOG_PATH = path.join(__dirname, '..', '..', '.cursor', 'debug.log');
const LOG_ENDPOINT = 'http://127.0.0.1:7242/ingest/1103e0a6-f59b-4299-9d81-19e1de28f587';

function emitLog(payload) {
    const base = {
        sessionId: 'debug-session',
        runId: 'run1-pre',
        timestamp: Date.now(),
        ...payload
    };
    fs.appendFile(LOG_PATH, JSON.stringify(base) + '\n', () => {});
    fetch(LOG_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(base)
    }).catch(() => {});
}

module.exports = { emitLog };

