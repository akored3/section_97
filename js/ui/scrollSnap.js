// Scroll snap on idle — lets fast scrolls fly freely, then gently aligns
// the nearest product card row when scrolling stops.

export function initScrollSnap() {
    const container = document.getElementById('product-container');
    if (!container) return;

    let scrollTimer = null;
    let isSnapping = false;

    // Header offset differs by screen size
    function getHeaderOffset() {
        return window.innerWidth < 768 ? 80 : 140;
    }

    function getNearestCard() {
        const cards = container.querySelectorAll('.product-card');
        if (!cards.length) return null;

        const offset = getHeaderOffset();
        let closest = null;
        let closestDist = Infinity;

        for (const card of cards) {
            const rect = card.getBoundingClientRect();
            const dist = Math.abs(rect.top - offset);
            if (dist < closestDist) {
                closestDist = dist;
                closest = card;
            }
        }

        return closest;
    }

    function snapToNearest() {
        const card = getNearestCard();
        if (!card) return;

        const offset = getHeaderOffset();
        const rect = card.getBoundingClientRect();
        const distance = rect.top - offset;

        // Skip if already nearly aligned (< 5px — no visible jump needed)
        if (Math.abs(distance) < 5) return;

        isSnapping = true;
        window.scrollBy({ top: distance, behavior: 'smooth' });

        // Reset snapping flag after scroll animation completes
        setTimeout(() => { isSnapping = false; }, 400);
    }

    // Respect reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    window.addEventListener('scroll', () => {
        if (isSnapping) return;

        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(snapToNearest, 150);
    }, { passive: true });
}
