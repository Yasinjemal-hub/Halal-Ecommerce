/**
 * Simple request logger middleware
 */
const requestLogger = (req, res, next) => {
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
