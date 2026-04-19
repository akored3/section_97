// Sentry error monitoring — initialized on every page via CDN bundle + this file.
// DSN is public by design (accepts errors only, never reads). Safe to commit.

(function initSentry() {
    if (!window.Sentry) return;

    const host = window.location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '';

    Sentry.init({
        dsn: 'https://ee210035ffd193482d0a3eb008e0b475@o4511247297544192.ingest.us.sentry.io/4511247300100096',
        tunnel: '/api/sentry-tunnel',
        environment: isLocal ? 'development' : 'production',
        release: 'section97@' + (window.__APP_RELEASE__ || 'unknown'),
        tracesSampleRate: 0.1,
        beforeSend(event) {
            // Skip local dev errors so you don't eat your monthly quota poking at things.
            if (isLocal) return null;
            return event;
        },
    });
})();
