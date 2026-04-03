// Enhanced lazy loading with Intersection Observer and fade-in animations

let currentObserver = null;

export function initializeLazyLoading() {
    // Disconnect previous observer to prevent memory leaks on re-renders
    if (currentObserver) {
        currentObserver.disconnect();
        currentObserver = null;
    }

    // Check for IntersectionObserver support
    if (!('IntersectionObserver' in window)) {
        // Fallback: load all images immediately
        loadAllImages();
        return;
    }

    currentObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                loadImage(img);
                observer.unobserve(img);
            }
        });
    }, {
        // Start loading well ahead of viewport for smooth scrolling
        rootMargin: '500px 0px',
        threshold: 0.01
    });

    // Observe all images with lazy-load class
    const lazyImages = document.querySelectorAll('img.lazy-load');
    lazyImages.forEach(img => currentObserver.observe(img));
}

function loadImage(img) {
    const src = img.dataset.src;
    if (!src) return;

    img.src = src;
    img.classList.add('loaded');
    img.classList.remove('lazy-load');
}

function loadAllImages() {
    // Fallback for browsers without IntersectionObserver
    const lazyImages = document.querySelectorAll('img.lazy-load');
    lazyImages.forEach(img => {
        if (img.dataset.src) {
            img.src = img.dataset.src;
            img.classList.add('loaded');
            img.classList.remove('lazy-load');
        }
    });
}
