// Order-confirmed celebration — themed canvas-confetti burst
// Lazy-loaded; fires once per successful order placement.

let confettiPromise = null;

function loadConfetti() {
    if (confettiPromise) return confettiPromise;
    if (window.confetti) {
        confettiPromise = Promise.resolve(window.confetti);
        return confettiPromise;
    }
    confettiPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'js/vendor/canvas-confetti.min.js';
        s.onload = () => resolve(window.confetti);
        s.onerror = () => {
            confettiPromise = null;
            reject(new Error('canvas-confetti failed to load'));
        };
        document.head.appendChild(s);
    });
    return confettiPromise;
}

const NEON_PALETTE = ['#00ff64', '#00ffd5', '#ffd700', '#ffffff', '#00ff9e'];
const GOLD_PALETTE = ['#ffd700', '#ffffff'];

export async function celebrateOrder() {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let confetti;
    try {
        confetti = await loadConfetti();
    } catch {
        return;
    }
    if (!confetti) return;

    const base = {
        particleCount: 60,
        spread: 60,
        startVelocity: 50,
        ticks: 220,
        zIndex: 1000,
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
            zIndex: 1000,
            disableForReducedMotion: true,
        });
    }, 220);
}
