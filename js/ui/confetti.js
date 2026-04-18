// Order-confirmed celebration — themed canvas-confetti burst
// Lazy-loaded; fires once per successful order placement.
// Uses a non-worker instance (useWorker: false) to comply with our CSP,
// which doesn't allow blob: URLs in worker-src / script-src.

let confettiPromise = null;

function loadVendorScript() {
    if (window.confetti) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'js/vendor/canvas-confetti.min.js';
        s.onload = () => (window.confetti ? resolve() : reject(new Error('confetti global missing')));
        s.onerror = () => reject(new Error('canvas-confetti failed to load'));
        document.head.appendChild(s);
    });
}

function getConfettiFn() {
    if (confettiPromise) return confettiPromise;
    confettiPromise = loadVendorScript().then(() => {
        const canvas = document.createElement('canvas');
        Object.assign(canvas.style, {
            position: 'fixed',
            inset: '0',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: '1000',
        });
        document.body.appendChild(canvas);
        return window.confetti.create(canvas, { resize: true, useWorker: false });
    }).catch(err => {
        confettiPromise = null;
        throw err;
    });
    return confettiPromise;
}

const NEON_PALETTE = ['#00ff64', '#00ffd5', '#ffd700', '#ffffff', '#00ff9e'];
const GOLD_PALETTE = ['#ffd700', '#ffffff'];

export async function celebrateOrder() {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let confetti;
    try {
        confetti = await getConfettiFn();
    } catch {
        return;
    }

    const base = {
        particleCount: 60,
        spread: 60,
        startVelocity: 50,
        ticks: 220,
        disableForReducedMotion: true,
        colors: NEON_PALETTE,
        shapes: ['square', 'star'],
    };

    confetti({ ...base, angle: 60,  origin: { x: 0, y: 0.85 } });
    confetti({ ...base, angle: 120, origin: { x: 1, y: 0.85 } });

    setTimeout(() => {
        confetti({
            particleCount: 35,
            spread: 130,
            startVelocity: 40,
            angle: 90,
            origin: { x: 0.5, y: 0.75 },
            colors: GOLD_PALETTE,
            shapes: ['star'],
            scalar: 1.2,
            ticks: 260,
            disableForReducedMotion: true,
        });
    }, 220);
}
