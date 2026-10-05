/**
 * Request logger middleware.
 * Development/test: one line per request (as before).
 * Production: only failures (status >= 400) and slow responses (>1000ms),
 * with duration — synchronous console I/O on every request measurably
 * slows high-traffic handlers, so the hot path stays quiet.
 */
const SLOW_MS = 1000;

const requestLogger = (req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
        const start = process.hrtime.bigint();
        res.on('finish', () => {
            const ms = Number(process.hrtime.bigint() - start) / 1e6;
            if (res.statusCode >= 400 || ms > SLOW_MS) {
                console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(0)}ms`);
            }
        });
        return next();
    }

    const timestamp = new Date().toISOString();
    // Redact sensitive query params to avoid logging passwords, tokens, or secrets
    let safeUrl = req.originalUrl;
    try {
        const urlObj = new URL(req.originalUrl, `http://${req.headers.host || 'localhost'}`);
        const sensitive = ['password', 'token', 'secret', 'key', 'pin', 'newPassword'];
        sensitive.forEach((p) => {
            if (urlObj.searchParams.has(p)) urlObj.searchParams.set(p, 'REDACTED');
        });
        safeUrl = urlObj.pathname + urlObj.search;
    } catch (err) {
        // If URL parsing fails, fall back to original
    }

    console.log(`[${timestamp}] ${req.method} ${safeUrl}`);
    next();
};

export default requestLogger;
